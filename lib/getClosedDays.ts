import { supabase } from "@/lib/supabaseClient";

export async function getClosedDays(year: number, month: number): Promise<string[]> {
  // Get the first and last day of this month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  // Fetch global general hours
  const { data: general } = await supabase.from("general_hours").select("*");

  // Fetch day-specific overrides
  const { data: custom } = await supabase
    .from("custom_hours")
    .select("*")
    .gte("date", formatLocalISO(start))
    .lte("date", formatLocalISO(end));

  const closed: Set<string> = new Set();

  // 1️⃣ Mark custom closures
  custom?.forEach((ch) => {
    if (ch.is_closed || !ch.open_time || !ch.close_time) {
      closed.add(ch.date);
    }
  });

  // 2️⃣ Add general closures for non-overridden days
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = formatLocalISO(d);
    if (custom?.some((ch) => ch.date === iso)) continue;

    // Compute weekday properly (local)
    const weekday = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][d.getDay()];

    const match = general?.find((g) => g.weekday === weekday);
    if (match?.is_closed || !match?.open_time || !match?.close_time) {
      closed.add(iso);
    }
  }

  return Array.from(closed);
}

// ✅ Local-date safe formatter (no UTC shift)
function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
