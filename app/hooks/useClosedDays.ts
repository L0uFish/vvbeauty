"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CustomHour, GeneralHour } from "@/app/types/scheduling";
import { getDateKey } from "@/app/utils/date";

/* -------------------------------------------------------
   Determine if a given date is closed (custom > general).
------------------------------------------------------- */
function isDayClosed(
  date: Date,
  customHours: CustomHour[],
  generalHours: GeneralHour[]
): boolean {
  const key = getDateKey(date);

  // 1) Custom hours override
  const custom = customHours.find((h) => h.date === key);
  if (custom) return custom.is_closed === true;

  // 2) Fallback to general hours (weekday)
  const weekday = date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const general = generalHours.find((h) => h.weekday === weekday);

  return general?.is_closed ?? true; // default = closed
}

/* -------------------------------------------------------
   Hook: returns array of closed YYYY-MM-DD strings
------------------------------------------------------- */
export function useClosedDays(year: number, month: number) {
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        /* -------------------------------
           1. Fetch general_hours
        -------------------------------- */
        const { data: general, error: genErr } = await supabase
          .from("general_hours")
          .select("*");

        if (genErr || !general) {
          console.error("Failed loading general hours:", genErr);
          setClosedDays([]);
          return;
        }

        /* -------------------------------
           2. Fetch custom_hours for month
        -------------------------------- */
        const monthStr = String(month + 1).padStart(2, "0");
        const start = `${year}-${monthStr}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const end = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

        const { data: custom, error: cusErr } = await supabase
          .from("custom_hours")
          .select("date, open_time, close_time, is_closed")
          .gte("date", start)
          .lte("date", end);

        if (cusErr || !custom) {
          console.error("Failed loading custom hours:", cusErr);
          setClosedDays([]);
          return;
        }

        const generalHours = general as GeneralHour[];
        const customHours = custom as CustomHour[];

        /* -------------------------------
           3. Loop days and check closure
        -------------------------------- */
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const closed: string[] = [];

        for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
          if (isDayClosed(d, customHours, generalHours)) {
            closed.push(getDateKey(d));
          }
        }

        setClosedDays(closed);
      } catch (err) {
        console.error("useClosedDays error:", err);
        setClosedDays([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [year, month]);

  return { closedDays, loading };
}
