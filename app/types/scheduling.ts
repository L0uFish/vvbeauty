// === CENTRAL SCHEDULING TYPES ===
// One source of truth for all booking & admin logic

/** Standard weekly hours */
export interface GeneralHour {
  id?: string;
  weekday: string; // e.g., "monday"
  is_closed: boolean;
  open_time: string | null; // HH:MM:SS
  close_time: string | null; // HH:MM:SS
}

/** Date-specific override */
export interface CustomHour {
  id?: string;
  date: string; // YYYY-MM-DD
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  notes: string | null;
}

/** Manually blocked time periods */
export interface BlockedHour {
  id: string;
  blocked_date: string; // YYYY-MM-DD
  repeat_type: "none" | "daily" | "weekly" | "monthly";
  time_from: string; // HH:MM:SS
  time_until: string; // HH:MM:SS
  notes: string | null;
}

/** Booked appointment */
export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: "pending" | "confirmed" | "cancelled";
  client_name?: string;
  service_name?: string;
  service: {
    duration_minutes: number;
    buffer_minutes: number;
  } | null;
  duration_minutes?: number; // fallback if no service
  buffer_minutes?: number;   // fallback if no service
}

/** Admin calendar view mode */
export type View = "day" | "month" | "year";

/** Available time slot (HH:MM) */
export type AvailableTimeSlot = string;