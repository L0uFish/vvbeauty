// lib/getAvailableTimes.ts
import { supabase } from "@/lib/supabaseClient";

export async function getAvailableTimes(date: string, service: any) {
  const target = new Date(date);
  const weekday = target.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();

  // ---- 1️⃣ Fetch general opening hours ----
  const { data: general } = await supabase
    .from("general_hours")
    .select("*")
    .eq("weekday", weekday)
    .maybeSingle();

  // ---- 2️⃣ Check for custom override ----
  const { data: custom } = await supabase
    .from("custom_hours")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  const hours = custom || general;
  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) {
    return []; // salon closed
  }

  const openTime = toMinutes(hours.open_time);
  const closeTime = toMinutes(hours.close_time);

  // ---- 3️⃣ Fetch existing appointments ----
  const { data: appts } = await supabase
    .from("appointments")
    .select("time, services(duration_minutes, buffer_minutes)")
    .eq("date", date)
    .neq("status", "cancelled");

  // Flatten appointments into blocked minutes
  const bookedMinutes: [number, number][] = [];
  if (appts) {
    for (const appt of appts) {
      const start = toMinutes(appt.time);
      const svc = Array.isArray(appt.services) ? appt.services[0] : appt.services;
      const duration = svc?.duration_minutes || service.duration_minutes;
      const buffer = svc?.buffer_minutes || service.buffer_minutes || 0;
      bookedMinutes.push([start, start + duration + buffer]);
    }
  }

  // ---- 4️⃣ Fetch manually blocked periods ----
  const { data: blocks } = await supabase
    .from("blocked_hours")
    .select("*")
    .eq("blocked_date", date);

  if (blocks) {
    for (const b of blocks) {
      bookedMinutes.push([toMinutes(b.time_from), toMinutes(b.time_until)]);
    }
  }

  // ---- 5️⃣ Generate slot list ----
  const step = 30; // minutes per slot
  const available: string[] = [];

  for (let t = openTime; t + service.duration_minutes <= closeTime; t += step) {
    const end = t + service.duration_minutes + (service.buffer_minutes || 0);
    const overlap = bookedMinutes.some(([s, e]) => !(end <= s || t >= e));
    if (!overlap) available.push(toHHMM(t));
  }

  return available;
}

// --- helpers ---
function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
