// app/hooks/useAvailableTimes.ts
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { getAvailableTimes } from "../services/bookingRules";

export function useAvailableTimes(date: string | null, service: any) {
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date || !service) {
      console.log("useAvailableTimes: Missing date or service", { date, service });
      setTimes([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      console.log("useAvailableTimes: Starting load for", date);
      try {
        setLoading(true);

        // 1. APPOINTMENTS
        const { data: appointments, error: aptError } = await supabase
          .from("appointments")
          .select("time")
          .eq("date", date)
          .neq("status", "cancelled");

        if (aptError) throw aptError;

        console.log("Appointments fetched:", appointments?.length || 0, appointments);

        // 2. BLOCKED HOURS
        const { data: blockedRaw, error: blockError } = await supabase
          .from("blocked_hours")
          .select("time_from, time_until, blocked_date, repeat_type")
          .or(`blocked_date.eq.${date},repeat_type.neq.none`);

        if (blockError) throw blockError;

        console.log("Blocked hours raw:", blockedRaw);

        // 3. MAP APPOINTMENTS
        const appointmentsWithDuration = (appointments || []).map((apt: any) => ({
          time: apt.time,
          duration_minutes: service.duration_minutes,
          buffer_minutes: service.buffer_minutes,
        }));

        // 4. FILTER ACTIVE BLOCKS
        const targetDate = new Date(date);
        const activeBlocked = (blockedRaw || [])
          .filter((b: any) => {
            if (b.blocked_date === date) return true;
            if (b.repeat_type === "daily") return true;
            if (b.repeat_type === "weekly") {
              const blockDate = new Date(b.blocked_date);
              return blockDate.getDay() === targetDate.getDay();
            }
            if (b.repeat_type === "monthly") {
              const blockDate = new Date(b.blocked_date);
              return blockDate.getDate() === targetDate.getDate();
            }
            return false;
          })
          .map((b: any) => ({
            time_from: b.time_from,
            time_until: b.time_until,
          }));

        console.log("Active blocked hours:", activeBlocked);

        // 5. CALL BOOKING RULES
        const available = getAvailableTimes(
          date,
          service,
          appointmentsWithDuration,
          activeBlocked
        );

        console.log("getAvailableTimes RESULT:", {
          date,
          duration: service.duration_minutes,
          openTime: service.generalHours?.find((h: any) => 
            h.weekday === new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
          )?.open_time?.slice(0, 5),
          available,
        });

        setTimes(available);
      } catch (err: any) {
        console.error("useAvailableTimes ERROR:", err.message, err);
        setTimes([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [date, service]);

  return { times, loading };
}