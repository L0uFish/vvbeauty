// === CENTRAL SCHEDULING TYPES ===
// One source of truth for all booking & admin logic

/** Standard weekly hours */
export interface GeneralHour {
  id?: string;
  weekday: string; 
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

/** Date-specific override */
export interface CustomHour {
  id?: string;
  date: string; 
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  notes: string | null;
}

/** Manually blocked time periods */
export interface BlockedHour {
  id: string;
  blocked_date: string;
  repeat_type: "none" | "daily" | "weekly" | "monthly";
  time_from: string; 
  time_until: string; 
  notes: string | null;
}

/** Booked appointment */
export interface Appointment {
  id: string;
  date: string; 
  time: string; 
  status: "pending" | "confirmed" | "cancelled";
  client_name?: string;
  service_name?: string;
  service: {
    duration_minutes: number;
    buffer_minutes: number;
  } | null;
  duration_minutes?: number; 
  buffer_minutes?: number;   
}

/** Admin calendar view mode */
export type View = "day" | "month" | "year" | "list";

/** Available time slot (HH:MM) */
export type AvailableTimeSlot = string;

