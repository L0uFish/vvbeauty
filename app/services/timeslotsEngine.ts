// app/services/timeslotsEngine.ts
import { GeneralHour, CustomHour, BlockedHour } from "@/app/types/scheduling";

// --- helpers ---

function toMinutes(hhmmOrHhmmss: string | null): number | null {
  if (!hhmmOrHhmmss) return null;
  const [h, m] = hhmmOrHhmmss.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function getTimeslotsForDate(params: {
  date: string; // YYYY-MM-DD
  service: { duration_minutes: number; buffer_minutes: number };
  generalHours: GeneralHour[];
  customHours: CustomHour[];
  blockedHours: BlockedHour[]; // ideally already filtered to this date (or we filter)
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

  const total = service.duration_minutes + service.buffer_minutes;
  const day = new Date(date);
  const weekday = day
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  // 1) Determine opening window (general → custom override)
  const custom = customHours.find((c) => c.date === date);
  if (custom?.is_closed) return [];

  const general = generalHours.find((g) => g.weekday === weekday);
  if (!general || general.is_closed) return [];

  let openMin = custom?.open_time
    ? toMinutes(custom.open_time)!
    : toMinutes(general.open_time)!;
  let closeMin = custom?.close_time
    ? toMinutes(custom.close_time)!
    : toMinutes(general.close_time)!;

  // 2) Prepare blocked intervals (in minutes)
  const dayBlocked = blockedHours.filter((b) => b.blocked_date === date);

  const blockedRanges = dayBlocked.map((b) => ({
    start: toMinutes(b.time_from)!,
    end: toMinutes(b.time_until)!,
  }));

  // 3) Prepare appointment intervals (in minutes)
  const appointmentRanges = appointments.map((a) => {
    const start = toMinutes(a.time)!;
    const end = start + a.duration_minutes + a.buffer_minutes;
    return { start, end };
  });

  // 4) Loop over candidate starts in 30-min steps
  const result: string[] = [];

  // Round start up to next 30-min boundary
  if (openMin % 30 !== 0) {
    openMin = Math.ceil(openMin / 30) * 30;
  }

  for (let start = openMin; start + total <= closeMin; start += 30) {
    const end = start + total;
    let conflict = false;

    // 4A) Check against blocked hours
    for (const b of blockedRanges) {
      if (rangesOverlap(start, end, b.start, b.end)) {
        conflict = true;
        break;
      }
    }

    if (conflict) continue;

    // 4B) Check against existing appointments
    for (const a of appointmentRanges) {
      if (rangesOverlap(start, end, a.start, a.end)) {
        conflict = true;
        break;
      }
    }

    if (!conflict) {
      result.push(toHHMM(start));
    }
  }

  return result;
}
