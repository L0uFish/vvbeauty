import { BlockedHour, CustomHour, GeneralHour } from "@/app/types/scheduling";
// --- Time Conversion Helpers ---

/**
 * Converts HH:MM string to minutes since midnight.
 */
export const toMinutes = (time: string | null): number => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Converts minutes since midnight to HH:MM string.
 */
export const toHHMM = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// --- Date/Weekday Helpers ---

/**
 * Helper to format Date object to YYYY-MM-DD string.
 */
export function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Helper to get day name for general_hours table lookup (e.g., "monday").
 */
export function getWeekdayName(date: Date): string {
  // Use 'en-US' locale for standardizing weekday names
  return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

/**
 * Priority Logic: Custom Hours (explicitly closed) > General Hours (default closed)
 * Determines if a day is fully closed based on the schedule.
 */
export function isClosedOrCustomHours(
  date: Date,
  customHours: CustomHour[],
  generalHours: GeneralHour[]
): boolean {
  const dateKey = getDateKey(date);
  const weekday = getWeekdayName(date);

  const customEntry = customHours.find((c) => c.date === dateKey);
  const generalEntry = generalHours.find((g) => g.weekday === weekday);

  // 1. Check Custom Override (Highest Priority)
  if (customEntry) {
    // If custom entry exists and marks the day as closed, or doesn't define open times
    return customEntry.is_closed || !customEntry.open_time || !customEntry.close_time;
  }

  // 2. Check General Schedule (Fallback)
  if (generalEntry) {
    // If general schedule marks the day as closed, or doesn't define open times
    return generalEntry.is_closed || !generalEntry.open_time || !generalEntry.close_time;
  }

  // If no schedule entry exists, assume closed for safety (optional: adjust as per business default)
  return true;
}

/**
 * Calculates which BlockedHours (including recurring ones) are active for a specific date.
 */
export function getRecurringBlockedHours(
  allBlocks: BlockedHour[],
  dateKey: string, // YYYY-MM-DD
  date: Date
): BlockedHour[] {
  const dayOfWeekIndex = date.getDay(); // 0 (Sunday) to 6 (Saturday)

  return allBlocks.filter((block) => {
    // Block must start on or before the current date to be considered active
    if (block.blocked_date > dateKey) {
      return false;
    }

    // 1. Non-recurring blocks: must match the specific date
    if (block.repeat_type === "none") {
      return block.blocked_date === dateKey;
    }

    // 2. Daily recurring blocks
    if (block.repeat_type === "daily") {
      return true; // Active every day after the start date
    }

    // 3. Weekly recurring blocks: must match weekday AND be after start date
    if (block.repeat_type === "weekly") {
      // Determine the weekday of the block's start date
      const blockDate = new Date(block.blocked_date + "T00:00:00");
      const blockDayOfWeekIndex = blockDate.getDay();

      return blockDayOfWeekIndex === dayOfWeekIndex;
    }

    // 4. Monthly recurring blocks: must match day of month AND be after start date
    if (block.repeat_type === "monthly") {
      // Determine the day of the month of the block's start date
      const blockDate = new Date(block.blocked_date + "T00:00:00");
      const blockDayOfMonth = blockDate.getDate();

      return blockDayOfMonth === date.getDate();
    }

    return false;
  });
}