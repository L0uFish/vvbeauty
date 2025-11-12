import { useState, useEffect } from "react";
import { getGeneralHours, getCustomHoursForMonth } from "../services/workingHoursService";
import { isDayClosed } from "../services/bookingRules";
import { getDateKey } from "../utils/date";

// Helper to wrap async call with error handling
async function safeFetch<T>(promise: Promise<T>): Promise<{ data: T | null; error: any }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export function useClosedDays(year: number, month: number) {
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [generalResult, customResult] = await Promise.all([
          safeFetch(getGeneralHours()),
          safeFetch(getCustomHoursForMonth(year, month)),
        ]);

        if (generalResult.error) throw generalResult.error;
        if (customResult.error) throw customResult.error;

        const general = generalResult.data!;
        const customMonth = customResult.data!;

        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const closed: string[] = [];

        for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
          if (isDayClosed(d, customMonth, general)) {
            closed.push(getDateKey(d));
          }
        }

        setClosedDays(closed);
      } catch (err: any) {
        console.error("Failed to load closed days:", err?.message || err);
        setClosedDays([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [year, month]);

  return { closedDays, loading };
}