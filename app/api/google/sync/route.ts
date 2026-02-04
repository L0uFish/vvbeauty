// app/api/google/sync/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Payload = {
  table: string;
  op: "INSERT" | "UPDATE" | "DELETE";
  record: any;
  old_record?: any;
};

function b64ToJson(b64: string) {
  const raw = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(raw);
}

async function getAccessTokenFromServiceAccount() {
  const saB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!saB64) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");

  const sa = b64ToJson(saB64);

  if (!sa?.client_email) throw new Error("Service account JSON missing client_email");
  if (!sa?.private_key) throw new Error("Service account JSON missing private_key");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsigned = `${base64url(header)}.${base64url(claims)}`;

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();

  const signature = sign
    .sign(sa.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(json)}`);

  if (!json?.access_token) throw new Error("Token response missing access_token");
  return json.access_token as string;
}

function isoFromDateAndTime(dateStr: string, timeStr: string) {
  return `${dateStr}T${timeStr}:00`;
}

async function googleUpsertEvent(args: {
  accessToken: string;
  calendarId: string;
  eventId?: string;
  summary: string;
  startISO: string;
  endISO: string;
}) {
  const { accessToken, calendarId, eventId, summary, startISO, endISO } = args;

  const body = {
    summary,
    start: { dateTime: startISO, timeZone: "Europe/Brussels" },
    end: { dateTime: endISO, timeZone: "Europe/Brussels" },
  };

  const url = eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(eventId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const method = eventId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore parse errors; keep raw text
  }

  if (!res.ok) {
    throw new Error(
      `Google event upsert failed: ${res.status} ${json ? JSON.stringify(json) : text}`
    );
  }

  if (!json?.id) throw new Error("Google upsert succeeded but response missing id");
  return json.id as string;
}

async function googleDeleteEvent(accessToken: string, calendarId: string, eventId: string) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Google returns 204; 404 is okay (already gone)
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Google event delete failed: ${res.status} ${text}`);
  }
}

function calendarForEntity(entityType: "appointment" | "block" | "hours") {
  if (entityType === "appointment") return process.env.GCAL_APPOINTMENTS_CALENDAR_ID!;
  if (entityType === "block") return process.env.GCAL_BLOCKS_CALENDAR_ID!;
  return process.env.GCAL_HOURS_CALENDAR_ID!;
}

export async function POST(req: Request) {
  try {
    // --- webhook auth ---
    const secret =
      req.headers.get("x-webhook-secret") ?? req.headers.get("X-Webhook-Secret");

    if (!process.env.GOOGLE_SYNC_WEBHOOK_SECRET) {
      throw new Error("Missing GOOGLE_SYNC_WEBHOOK_SECRET (server env)");
    }

    if (secret !== process.env.GOOGLE_SYNC_WEBHOOK_SECRET) {
      console.warn("[gcal-sync] invalid webhook secret");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = (await req.json()) as Payload;
    console.log("[gcal-sync] payload:", payload?.table, payload?.op);

    // --- minimal payload guard ---
    if (!payload?.table || !payload?.op) {
      return NextResponse.json({ ok: true, ignored: true, reason: "missing table/op" });
    }
    if (!payload?.record?.id) {
      return NextResponse.json({ ok: true, ignored: true, reason: "missing record.id" });
    }
    // if you ever use dummy testing ids:
    if (payload.record.id === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ ok: true, ignored: true, reason: "dummy id" });
    }

    // --- env sanity ---
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
    if (!supabaseKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const accessToken = await getAccessTokenFromServiceAccount();

    // Decide entity type from table
    const entityType =
      payload.table === "appointments"
        ? ("appointment" as const)
        : payload.table === "blocked_hours"
        ? ("block" as const)
        : payload.table === "custom_hours"
        ? ("hours" as const)
        : null;

    if (!entityType) {
      console.log("[gcal-sync] ignored table:", payload.table);
      return NextResponse.json({ ok: true, ignored: true, reason: "untracked table" });
    }

    const entityId = payload.record.id as string;

    // Look up existing mapping
    const { data: mapRow, error: mapErr } = await supabase
      .from("google_event_map")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (mapErr) {
      throw new Error(`Supabase fetch google_event_map failed: ${JSON.stringify(mapErr)}`);
    }

    const calendarId = calendarForEntity(entityType);
    if (!calendarId) throw new Error(`Missing calendar ID env for ${entityType}`);

    // DELETE behaviour
    if (payload.op === "DELETE") {
      if (mapRow?.google_event_id) {
        await googleDeleteEvent(accessToken, mapRow.google_calendar_id, mapRow.google_event_id);
        const { error: delErr } = await supabase
          .from("google_event_map")
          .delete()
          .eq("entity_type", entityType)
          .eq("entity_id", entityId);

        if (delErr) {
          throw new Error(`Supabase delete google_event_map failed: ${JSON.stringify(delErr)}`);
        }

        console.log("[gcal-sync] deleted event", entityType, entityId);
      } else {
        console.log("[gcal-sync] delete: no mapping (already gone)", entityType, entityId);
      }
      return NextResponse.json({ ok: true });
    }

    // INSERT / UPDATE behaviour
    let summary = "VVBeauty";
    let startISO = "";
    let endISO = "";

    if (entityType === "appointment") {
      const apptId = entityId;

      const { data, error } = await supabase
        .from("appointments")
        .select("id,date,time,status, services:service_id(name,duration_minutes), clients:user_id(full_name)")
        .eq("id", apptId)
        .single();

      if (error) throw new Error(`Supabase fetch appt failed: ${JSON.stringify(error)}`);

      // cancelled -> delete
      if (data.status === "cancelled") {
        if (mapRow?.google_event_id) {
          await googleDeleteEvent(accessToken, mapRow.google_calendar_id, mapRow.google_event_id);
          const { error: delMapErr } = await supabase
            .from("google_event_map")
            .delete()
            .eq("entity_type", entityType)
            .eq("entity_id", entityId);

          if (delMapErr) {
            throw new Error(`Supabase delete google_event_map failed: ${JSON.stringify(delMapErr)}`);
          }

          console.log("[gcal-sync] cancelled -> deleted", entityId);
        }
        return NextResponse.json({ ok: true, cancelled: true });
      }

      const service = Array.isArray(data.services) ? data.services[0] : data.services;
      const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;

      const serviceName = service?.name ?? "Service";
      const clientName = client?.full_name ?? "Client";
      const duration = service?.duration_minutes ?? 60;

      summary = `${serviceName} – ${clientName}`;

      startISO = isoFromDateAndTime(String(data.date), String(data.time));

      const [h, m] = String(data.time).split(":").map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + duration;

      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;

      const pad = (n: number) => String(n).padStart(2, "0");
      endISO = `${String(data.date)}T${pad(endH)}:${pad(endM)}:00`;
    }

    if (entityType === "block") {
      const b = payload.record;
      summary = "BLOCK";
      startISO = `${b.blocked_date}T${String(b.time_from).slice(0, 5)}:00`;
      endISO = `${b.blocked_date}T${String(b.time_until).slice(0, 5)}:00`;
    }

    if (entityType === "hours") {
      const h = payload.record;

      // Only day overrides become events
      if (h.type !== "day" || !h.date) {
        console.log("[gcal-sync] hours ignored (not day override)", h.type);
        return NextResponse.json({ ok: true, ignored: true, reason: "not day override" });
      }

      if (h.is_closed) {
        summary = "CLOSED";
        startISO = `${h.date}T00:00:00`;
        endISO = `${h.date}T23:59:00`;
      } else {
        summary = "OPEN";
        startISO = `${h.date}T${String(h.open_time).slice(0, 5)}:00`;
        endISO = `${h.date}T${String(h.close_time).slice(0, 5)}:00`;
      }
    }

    const googleEventId = await googleUpsertEvent({
      accessToken,
      calendarId,
      eventId: mapRow?.google_event_id,
      summary,
      startISO,
      endISO,
    });

    if (mapRow?.google_event_id) {
      const { error: updErr } = await supabase
        .from("google_event_map")
        .update({ updated_at: new Date().toISOString() })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);

      if (updErr) {
        throw new Error(`Supabase update google_event_map failed: ${JSON.stringify(updErr)}`);
      }

      console.log("[gcal-sync] updated event", entityType, entityId, googleEventId);
    } else {
      const { error: insErr } = await supabase.from("google_event_map").insert({
        entity_type: entityType,
        entity_id: entityId,
        google_calendar_id: calendarId,
        google_event_id: googleEventId,
      });

      if (insErr) {
        throw new Error(`Supabase insert google_event_map failed: ${JSON.stringify(insErr)}`);
      }

      console.log("[gcal-sync] created event", entityType, entityId, googleEventId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[gcal-sync] fatal:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
