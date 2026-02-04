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
  // Minimal JWT flow without extra deps
  const saB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64!;
  const sa = b64ToJson(saB64);

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
  return json.access_token as string;
}

function isoFromDateAndTime(dateStr: string, timeStr: string) {
  // date is 'YYYY-MM-DD', time is text (assume 'HH:MM')
  // Use Europe/Brussels local time — Google API supports timeZone field.
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
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`;

  const method = eventId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Google event upsert failed: ${JSON.stringify(json)}`);

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
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.GOOGLE_SYNC_WEBHOOK_SECRET) {
    console.warn("[gcal-sync] invalid webhook secret");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as Payload;
  console.log("[gcal-sync] payload:", payload?.table, payload?.op);


  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    return NextResponse.json({ ok: true, ignored: true });
  }

  const entityId = payload.record?.id;
  if (!entityId) return NextResponse.json({ ok: false, error: "Missing record.id" }, { status: 400 });

  // Look up existing mapping
  const { data: mapRow } = await supabase
    .from("google_event_map")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  const calendarId = calendarForEntity(entityType);

  // DELETE behaviour
  if (payload.op === "DELETE") {
    if (mapRow?.google_event_id) {
      await googleDeleteEvent(accessToken, mapRow.google_calendar_id, mapRow.google_event_id);
      await supabase
        .from("google_event_map")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      console.log("[gcal-sync] deleted event", entityType, entityId);
    } else {
      console.log("[gcal-sync] delete: no mapping (already gone)", entityType, entityId);
    }
    return NextResponse.json({ ok: true });
  }

  // INSERT / UPDATE behaviour
  // Build summary + times depending on entity type
  let summary = "VVBeauty";
  let startISO = "";
  let endISO = "";

  if (entityType === "appointment") {
    // fetch service + client name
    const appt = payload.record;
    const { data, error } = await supabase
      .from("appointments")
      .select("id,date,time,status, services:service_id(name,duration_minutes), clients:user_id(full_name)")
      .eq("id", appt.id)
      .single();

    if (error) throw new Error(`Supabase fetch appt failed: ${JSON.stringify(error)}`);

    // If cancelled: delete in Google (your “source of truth” rule)
    if (data.status === "cancelled") {
      if (mapRow?.google_event_id) {
        await googleDeleteEvent(accessToken, mapRow.google_calendar_id, mapRow.google_event_id);
        await supabase.from("google_event_map").delete().eq("entity_type", entityType).eq("entity_id", entityId);
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
    startISO = isoFromDateAndTime(data.date, data.time);
    // end = start + duration minutes
    const [h, m] = (data.time as string).split(":").map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration;

    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    endISO = `${data.date}T${pad(endH)}:${pad(endM)}:00`;

  }

  if (entityType === "block") {
    const b = payload.record;
    summary = `BLOCK`;
    startISO = `${b.blocked_date}T${String(b.time_from).slice(0, 5)}:00`;
    endISO = `${b.blocked_date}T${String(b.time_until).slice(0, 5)}:00`;
  }

  if (entityType === "hours") {
    const h = payload.record;

    // Keep it simple: only day overrides (type='day') become events
    // If you want week/month too, we can expand.
    if (h.type !== "day" || !h.date) {
      console.log("[gcal-sync] hours ignored (not day override)", h.type);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (h.is_closed) {
      summary = `CLOSED`;
      startISO = `${h.date}T00:00:00`;
      endISO = `${h.date}T23:59:00`;
    } else {
      summary = `OPEN`;
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
    await supabase
      .from("google_event_map")
      .update({ updated_at: new Date().toISOString() })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    console.log("[gcal-sync] updated event", entityType, entityId, googleEventId);
  } else {
    await supabase.from("google_event_map").insert({
      entity_type: entityType,
      entity_id: entityId,
      google_calendar_id: calendarId,
      google_event_id: googleEventId,
    });
    console.log("[gcal-sync] created event", entityType, entityId, googleEventId);
  }

  return NextResponse.json({ ok: true });
}
