"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// --- Types ---
type View = "day" | "month" | "year";

type Appointment = {
  id: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
  note: string | null;
  client_name: string;
  service_name: string;
  service?: {
    duration_minutes?: number | null;
    buffer_minutes?: number | null;
  };
};

type BlockedHour = {
  id: string;
  blocked_date: string;
  time_from: string;
  time_until: string;
  notes: string | null;
};

type GeneralHour = {
  weekday: string;
  is_closed: boolean;
};


// --- Local date helpers (avoid timezone shift) ---
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// --- Main Page ---
export default function KalenderPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [view, setView] = useState<View>("day");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedHours, setBlockedHours] = useState<BlockedHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [generalHours, setGeneralHours] = useState<GeneralHour[]>([]);

  // --- Swipe tracking ---
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - endX;
    const threshold = 60;
    if (Math.abs(diff) > threshold) diff > 0 ? moveNext() : movePrev();
    touchStartX.current = null;
  };

  // --- Fetch data ---
  useEffect(() => {
    (async () => {
      setLoading(true);

      const start = new Date(cursorDate);
      const end = new Date(cursorDate);
      if (view === "day") end.setDate(end.getDate() + 1);
      if (view === "month") {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 1);
      }
      if (view === "year") {
        start.setMonth(0, 1);
        end.setFullYear(end.getFullYear() + 1, 0, 1);
      }

      const startISO = getDateKey(start);
      const endISO = getDateKey(end);

      const { data: rawAppts, error: e1 } = await supabase
        .from("appointments")
        .select("*")
        .gte("date", startISO)
        .lt("date", endISO)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (e1) console.error("Appointments error:", e1);

      const serviceIds = rawAppts?.map((a) => a.service_id).filter(Boolean) ?? [];
      const userIds = rawAppts?.map((a) => a.user_id).filter(Boolean) ?? [];

      const [{ data: services }, { data: clients }] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, duration_minutes, buffer_minutes")
          .in("id", serviceIds),
        supabase.from("clients").select("id, full_name").in("id", userIds),
      ]);

      const serviceMap = new Map(services?.map((s) => [s.id, s]) ?? []);
      const clientMap = new Map(clients?.map((c) => [c.id, c]) ?? []);

      const mappedAppts: Appointment[] =
        rawAppts?.map((a: any) => {
          const svc = serviceMap.get(a.service_id);
          const cli = clientMap.get(a.user_id);
          return {
            id: a.id,
            date: a.date,
            time: a.time,
            status: a.status,
            note: a.note ?? null,
            client_name: cli?.full_name ?? "—",
            service_name: svc?.name ?? "—",
            service: {
              duration_minutes: svc?.duration_minutes ?? null,
              buffer_minutes: svc?.buffer_minutes ?? null,
            },
          };
        }) ?? [];

      const { data: blocks, error: e2 } = await supabase
        .from("blocked_hours")
        .select("id, blocked_date, time_from, time_until, notes")
        .gte("blocked_date", startISO)
        .lt("blocked_date", endISO)
        .order("blocked_date", { ascending: true });
      if (e2) console.error("Blocked hours error:", e2);

      const { data: hours, error: e3 } = await supabase
        .from("general_hours")
        .select("weekday, is_closed");
      if (e3) console.error("General hours error:", e3);

      setAppointments(mappedAppts);
      setBlockedHours(blocks ?? []);
      setGeneralHours(hours ?? []);
      setLoading(false);
    })();
  }, [cursorDate, view, supabase]);

  // --- Navigation ---
  const movePrev = () => {
    const d = new Date(cursorDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    if (view === "year") d.setFullYear(d.getFullYear() - 1);
    setCursorDate(d);
  };
  const moveNext = () => {
    const d = new Date(cursorDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    if (view === "year") d.setFullYear(d.getFullYear() + 1);
    setCursorDate(d);
  };

  const isClosedDay = (date: Date) => {
  const weekday = date
    .toLocaleString("en-US", { weekday: "long" })
    .toLowerCase();
  const entry = generalHours.find((h: GeneralHour) => h.weekday === weekday);
  return entry?.is_closed ?? false;
};


  const title = useMemo(() => {
    const y = cursorDate.getFullYear();
    const m = cursorDate.toLocaleString("nl-BE", { month: "long" });
    const d = cursorDate.toLocaleDateString("nl-BE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    if (view === "day") return d;
    if (view === "month") return `${m} ${y}`;
    return `${y}`;
  }, [view, cursorDate]);

  // --- Render ---
  return (
    <div className="k-wrap" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="k-toolbar">
        <div className="k-filters">
          {["day", "month", "year"].map((v) => (
            <button
              key={v}
              className={`tab ${view === v ? "on" : ""}`}
              onClick={() => setView(v as View)}
            >
              {v === "day" ? "Dag" : v === "month" ? "Maand" : "Jaar"}
            </button>
          ))}
          <label className="k-check">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            Geannuleerden tonen
          </label>
        </div>
      </div>

      <div className="k-range">
        <button onClick={movePrev}>◀</button>
        <h3>{title}</h3>
        <button onClick={moveNext}>▶</button>
      </div>

      <div className="k-stage">
        {!loading && view === "day" && (
          <DayView
            date={cursorDate}
            appts={appointments}
            blocks={blockedHours}
            showCancelled={showCancelled}
            isClosedDay={isClosedDay}
          />
        )}
        {!loading && view === "month" && (
          <MonthView
            date={cursorDate}
            appts={appointments}
            blocks={blockedHours}
            showCancelled={showCancelled}
            isClosedDay={isClosedDay}
          />
        )}
        {!loading && view === "year" && (
          <YearView
            date={cursorDate}
            blocks={blockedHours}
            appts={appointments}
            showCancelled={showCancelled}
            generalHours={generalHours}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- DAY VIEW ---------- */
function DayView({ date, appts, blocks, showCancelled, isClosedDay }: any) {
  const dayISO = getDateKey(date);
  const closed = isClosedDay(date);
  const hours = Array.from({ length: 17 }, (_, i) => 6 + i);
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const dayStart = 6 * 60,
    dayEnd = 22 * 60,
    totalRange = dayEnd - dayStart,
    timelineHeight = 960;

  const items = [
    ...appts
      .filter((a: Appointment) => a.date === dayISO && (showCancelled || a.status !== "cancelled"))
      .map((a: Appointment) => {
        const duration = a.service?.duration_minutes ?? 60;
        const buffer = a.service?.buffer_minutes ?? 0;
        const start = toMinutes(a.time);
        const end = start + duration + buffer;
        return {
          id: a.id,
          start,
          end,
          color:
            a.status === "cancelled"
              ? "#9e9e9e"
              : "#66bb6a",
          label: `${a.client_name} — ${a.service_name}`,
          time: a.time,
        };
      }),
    ...blocks
      .filter((b: BlockedHour) => b.blocked_date === dayISO)
      .map((b: BlockedHour) => ({
        id: b.id,
        start: toMinutes(b.time_from),
        end: toMinutes(b.time_until),
        color: "#e57373",
        label: b.notes ?? "Geblokkeerd",
        time: b.time_from,
      })),
  ];

  return (
    <div className="day-grid" style={{ display: "grid", gridTemplateColumns: "80px 1fr" }}>
      <div className="ticks" style={{ position: "relative", height: `${timelineHeight}px`, borderRight: "1px dashed #ddd" }}>
        {hours.map((h) => (
          <div key={h} className="tick full" style={{ position: "absolute", top: `${((h * 60 - dayStart) / totalRange) * 100}%`, height: `${(60 / totalRange) * 100}%`, width: "100%", borderBottom: "1px dashed #eee" }}>
            <span className="label" style={{ position: "absolute", top: "2px", left: "8px", fontSize: "12px", color: "#777" }}>
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      <div className="lanes" style={{ position: "relative", height: `${timelineHeight}px`, background: closed ? "#ffe8ec" : "#fff" }}>
        {items.map((it) => {
          const top = ((it.start - dayStart) / totalRange) * 100;
          const height = ((it.end - it.start) / totalRange) * 100;
          return (
            <div key={it.id} className="bar" style={{ position: "absolute", top: `${top}%`, height: `${height}%`, left: "8px", right: "8px", borderRadius: "6px", background: it.color, color: "#fff", padding: "6px 8px", fontSize: "12px" }}>
              <div className="bar-time" style={{ fontWeight: "600", fontSize: "11px", marginBottom: "2px" }}>
                {it.time}
              </div>
              <div className="bar-label">{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- MONTH VIEW ---------- */
function MonthView({ date, appts, blocks, showCancelled, isClosedDay }: any) {
  const y = date.getFullYear(),
    m = date.getMonth(),
    first = new Date(y, m, 1),
    start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const byDay = new Map<string, { appts: Appointment[]; blocks: BlockedHour[] }>();
  for (const c of cells) byDay.set(getDateKey(c), { appts: [], blocks: [] });
  for (const a of appts) {
    if (a.status === "cancelled" && !showCancelled) continue;
    byDay.get(a.date)?.appts.push(a);
  }
  for (const b of blocks) byDay.get(b.blocked_date)?.blocks.push(b);

  return (
    <div className="month-grid pretty">
      {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
        <div key={d} className="dow">
          {d}
        </div>
      ))}
      {cells.map((d, i) => {
        const key = getDateKey(d);
        const { appts: aps, blocks: bls } = byDay.get(key)!;
        const out = d.getMonth() !== m;
        const closed = isClosedDay(d);
        return (
          <div key={i} className={`mcell ${out ? "out" : ""} ${closed ? "closed" : ""}`}>
            <div className="mdate">{d.getDate()}</div>
            <div className="mlines">
              {aps.map((a, idx) => (
                <div key={idx} className={`line ${a.status === "cancelled" ? "grey" : "green"}`} title={`${a.time} ${a.client_name} — ${a.service_name}`}>
                  <span className="mini-label">{a.client_name.split(" ")[0]} ({a.time})</span>
                </div>
              ))}
              {bls.map((b, idx) => (
                <div key={"b" + idx} className="line red" title={`Geblokkeerd: ${b.time_from}–${b.time_until}${b.notes ? " (" + b.notes + ")" : ""}`}>
                  <span className="mini-label">Blok: {b.time_from.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- YEAR VIEW ---------- */
function YearView({ date, blocks, appts, showCancelled, generalHours }: any) {
  const year = date.getFullYear(),
    months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const isClosedDay = (date: Date) => {
    const weekday = date
      .toLocaleString("en-US", { weekday: "long" })
      .toLowerCase();
    return generalHours.find((h: GeneralHour) => h.weekday === weekday)?.is_closed ?? false;
  };

  return (
    <div className="year-grid heatmap">
      {months.map((m, i) => {
        const mo = m.getMonth(),
          first = new Date(year, mo, 1),
          start = new Date(first);
        start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
        const days = Array.from({ length: 42 }, (_, j) => {
          const d = new Date(start);
          d.setDate(start.getDate() + j);
          return d;
        });

        return (
          <section key={i} className="year-month heat">
            <header>{m.toLocaleString("nl-BE", { month: "long" })}</header>
            <div className="mini-grid">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d, i) => (
                <div key={`dow-${i}`} className="mini-dow">{d}</div>
              ))}
              {days.map((d, j) => {
                const key = getDateKey(d);
                const inMonth = d.getMonth() === mo;
                const closed = isClosedDay(d);
                const dayAppts = appts.filter((a: Appointment) => a.date === key && (showCancelled || a.status !== "cancelled"));
                const dayBlocks = blocks.filter((b: BlockedHour) => b.blocked_date === key);

                const bars = [
                  ...dayAppts.map((a: Appointment) => ({
                    start: toMinutes(a.time),
                    end: toMinutes(a.time) + (a.service?.duration_minutes ?? 60) + (a.service?.buffer_minutes ?? 0),
                    color: a.status === "cancelled" ? "#aaa" : "#66bb6a",
                  })),
                  ...dayBlocks.map((b: BlockedHour) => ({
                    start: toMinutes(b.time_from),
                    end: toMinutes(b.time_until),
                    color: "#e57373",
                  })),
                ];

                return (
                  <div key={j} className={`mini-day ${inMonth ? "" : "out"} ${closed ? "closed" : ""}`} title={closed ? "Gesloten" : bars.length ? "Bezet" : "Vrij"}>
                    <span className="num">{d.getDate()}</span>
                    <div className="tiny-lanes">
                      {bars.map((b, k) => (
                        <div key={k} className="tiny-bar" style={{ top: `${((b.start - 360) / (840 - 360)) * 100}%`, height: `${((b.end - b.start) / (840 - 360)) * 100}%`, background: b.color }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
