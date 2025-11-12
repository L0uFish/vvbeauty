// app/services/bookingRules.ts
import { getDateKey } from "../utils/date";
import { CustomHour, GeneralHour } from "@/app/types/scheduling";

export function isDayClosed(
  date: Date,
  customHours: CustomHour[],
  generalHours: GeneralHour[]
): boolean {
  const dateKey = getDateKey(date);
  const custom = customHours.find((h) => h.date === dateKey);
  if (custom !== undefined) return custom.is_closed;

  const weekday = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const general = generalHours.find((h) => h.weekday === weekday);
  return general?.is_closed ?? true;
}

export function getUnavailableBlocks(
  appointments: Array<{ time: string; duration_minutes: number; buffer_minutes: number }>,
  serviceDuration: number,
  serviceBuffer: number
): Set<string> {
  const blocked = new Set<string>();

  appointments.forEach((apt) => {
    const duration = apt.duration_minutes;
    const buffer = apt.buffer_minutes;

    let [hours, minutes] = apt.time.split(":").map(Number);
    let current = hours * 60 + minutes;
    const totalMinutes = duration + buffer;

    for (let i = 0; i < totalMinutes; i += 15) {
      const h = String(Math.floor((current + i) / 60)).padStart(2, "0");
      const m = String((current + i) % 60).padStart(2, "0");
      blocked.add(`${h}:${m}`);
    }
  });

  return blocked;
}

export function getAvailableTimes(
  date: string,
  service: any,
  appointments: Array<{ time: string; duration_minutes: number; buffer_minutes: number }>,
  blockedHours: Array<{ time_from: string; time_until: string }> = []
): string[] {
  const blocked = getUnavailableBlocks(
    appointments,
    service.duration_minutes,
    service.buffer_minutes
  );

  // BLOCKED HOURS
  blockedHours.forEach((block) => {
    const [startH, startM] = block.time_from.split(":").map(Number);
    const [endH, endM] = block.time_until.split(":").map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    while (current < end) {
      const h = String(Math.floor(current / 60)).padStart(2, "0");
      const m = String(current % 60).padStart(2, "0");
      blocked.add(`${h}:${m}`);
      current += 15;
    }
  });

  const times: string[] = [];

  const dateObj = new Date(date);
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  // 1. GENERAL HOURS
  const generalHour = service.generalHours?.find((h: any) => h.weekday === weekday);
  if (!generalHour || generalHour.is_closed) {
    return []; // Day is closed
  }

  let openTime = generalHour.open_time?.slice(0, 5) ?? "09:00";
  let closeTime = generalHour.close_time?.slice(0, 5) ?? "19:00";

  // 2. CUSTOM HOURS OVERRIDE
  const customHour = service.customHours?.find((h: any) => h.date === date);
  if (customHour) {
    if (customHour.is_closed) return [];
    openTime = customHour.open_time?.slice(0, 5) ?? openTime;
    closeTime = customHour.close_time?.slice(0, 5) ?? closeTime;
  }

  let [openH, openM] = openTime.split(":").map(Number);
  let [closeH, closeM] = closeTime.split(":").map(Number);

  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  // Round up to 30-min boundary
  if (current % 30 !== 0) {
    current = Math.ceil(current / 30) * 30;
  }

  while (current + service.duration_minutes <= end) {
    const h = String(Math.floor(current / 60)).padStart(2, "0");
    const m = String(current % 60).padStart(2, "0");
    const timeStr = `${h}:${m}`;

    if (!blocked.has(timeStr)) {
      times.push(timeStr);
    }

    current += 30;
  }

  return times;
}