// app/services/timeslotsEngine.ts
import { GeneralHour, CustomHour, BlockedHour } from "@/app/types/scheduling";

// --- helpers ---

// Convert "HH:MM" to minutes
function toMinutes(hhmmOrHhmmss: string | null): number | null {
  if (!hhmmOrHhmmss) return null;
  const [h, m] = hhmmOrHhmmss.split(":").map(Number);
  return h * 60 + m;
}

// Convert minutes back to "HH:MM"
function toHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Check if two ranges overlap
function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function getTimeslotsForDate(params: {
  date: string;
  service: { duration_minutes: number; buffer_minutes: number };
  generalHours: GeneralHour[];
  customHours: CustomHour[];
  blockedHours: BlockedHour[];
  appointments: Array<{ time: string; duration_minutes: number; buffer_minutes: number }>;
}): string[] {
  const {
    date,
    service,
    generalHours,
    customHours,
    blockedHours,
    appointments,
  } = params;

  // Total time needed (service + buffer)
  const total = service.duration_minutes + service.buffer_minutes;

  // Determine weekday name (monday, tuesday...)
  const day = new Date(date);
  const weekday = day
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  // Check for custom day override
  const custom = customHours.find((c) => c.date === date);
  if (custom?.is_closed) return [];

  // Get general opening hours for that weekday
  const general = generalHours.find((g) => g.weekday === weekday);
  if (!general || general.is_closed) return [];

  // Pick custom hours if present, otherwise general hours
  let openMin = custom?.open_time
    ? toMinutes(custom.open_time)!
    : toMinutes(general.open_time)!;

  let closeMin = custom?.close_time
    ? toMinutes(custom.close_time)!
    : toMinutes(general.close_time)!;

  // All blocked-time entries for this day
  const dayBlocked = blockedHours.filter((b) => b.blocked_date === date);

  // Convert blocked times to minute ranges
  const blockedRanges = dayBlocked.map((b) => ({
    start: toMinutes(b.time_from)!,
    end: toMinutes(b.time_until)!,
  }));

  // Convert existing appointments to minute ranges
  const appointmentRanges = appointments.map((a) => {
    const start = toMinutes(a.time)!;
    const end = start + a.duration_minutes + a.buffer_minutes;
    return { start, end };
  });

  const result: string[] = [];

  // Round opening time up to next 30-minute block if needed
  if (openMin % 30 !== 0) {
    openMin = Math.ceil(openMin / 30) * 30;
  }

  // Loop through every 30-minute start time
  // Allow booking exactly at closing time
  for (let start = openMin; start <= closeMin; start += 30) {
    const end = start + total;
    let conflict = false;

    // Check blocked hours overlap
    for (const b of blockedRanges) {
      if (rangesOverlap(start, end, b.start, b.end)) {
        conflict = true;
        break;
      }
    }

    if (conflict) continue;

    // Check existing appointment overlap
    for (const a of appointmentRanges) {
      if (rangesOverlap(start, end, a.start, a.end)) {
        conflict = true;
        break;
      }
    }

    // If no conflicts, this timeslot is available
    if (!conflict) {
      result.push(toHHMM(start));
    }
  }

  return result;
}
