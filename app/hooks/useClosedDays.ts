// app/hooks/useClosedDays.ts
import { useEffect, useState } from "react";
import { getClosedDays } from "@/lib/getClosedDays";

export function useClosedDays(year: number, month: number) {
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getClosedDays(year, month)
      .then(setClosedDays)
      .catch((err) => {
        console.error("❌ Failed to load closed days:", err);
        setClosedDays([]);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  return { closedDays, loading };
}
