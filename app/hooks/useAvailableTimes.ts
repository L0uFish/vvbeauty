import { useEffect, useState } from "react";
import { getAvailableTimes } from "@/lib/getAvailableTimes";

export function useAvailableTimes(selectedDate: string | null, service: any) {
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate || !service) return;
    setLoading(true);
    getAvailableTimes(selectedDate, service)
      .then(setTimes)
      .catch((err) => {
        console.error("❌ Error loading available times:", err);
        setTimes([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate, service]);

  return { times, loading };
}
