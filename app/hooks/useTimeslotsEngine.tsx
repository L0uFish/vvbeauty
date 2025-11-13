// app/hooks/useTimeslotsEngine.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTimeslotsForDate } from "@/app/services/timeslotsEngine";
import { GeneralHour, CustomHour } from "@/app/types/scheduling";

// Supabase returns "services" as an ARRAY (even with a single relation)
type AppointmentRow = {
  time: string;
  status: string;
  services: {
    duration_minutes: number;
    buffer_minutes: number;
  }[] | null;
};

export function useTimeslotsEngine(
  date: string | null,
  service: {
    id: string;
    duration_minutes: number;
    buffer_minutes: number;
    generalHours: GeneralHour[];
    customHours: CustomHour[];
  }
) {
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !service) {
      setTimes([]);
      return;
    }

    (async () => {
      setLoading(true);

      const start = `${date}T00:00:00.000`;
      const end = `${date}T23:59:59.999`;

      // ======================================================
      // 1) FETCH APPOINTMENTS
      // ======================================================
      const { data: rawAppts, error: apptErr } = await supabase
        .from("appointments")
        .select(`
          time,
          status,
          services:service_id (
            duration_minutes,
            buffer_minutes
          )
        `)
        .gte("date", start)
        .lte("date", end)
        .neq("status", "cancelled");

      if (apptErr) {
        console.error("❌ Error fetching appointments:", apptErr);
      }

      // Normalize appointments
      const rows = (rawAppts ?? []) as AppointmentRow[];

      const appointments = rows.map((a) => {
        const serviceEntry = a.services?.[0]; // take first related service

        return {
          time: a.time,
          duration_minutes:
            serviceEntry?.duration_minutes ?? service.duration_minutes,
          buffer_minutes:
            serviceEntry?.buffer_minutes ?? service.buffer_minutes,
        };
      });

      // ======================================================
      // 2) FETCH BLOCKED HOURS
      // ======================================================
      const { data: blocks, error: blockErr } = await supabase
        .from("blocked_hours")
        .select("*")
        .eq("blocked_date", date);

      if (blockErr) {
        console.error("❌ Error fetching blocked hours:", blockErr);
      }

      // ======================================================
      // 3) BUILD TIMESLOTS
      // ======================================================
      const timeslots = getTimeslotsForDate({
        date,
        service,
        generalHours: service.generalHours,
        customHours: service.customHours,
        blockedHours: blocks ?? [],
        appointments,
      });

      setTimes(timeslots);
      setLoading(false);
    })();
  }, [date, service]);

  return { times, loading };
}
