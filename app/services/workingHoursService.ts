// app/services/workingHoursService.ts
import { supabase } from "@/lib/supabaseClient";
import { GeneralHour, CustomHour, BlockedHour } from "@/app/types/scheduling";

interface Cache {
  general: GeneralHour[] | null;
  blocked: BlockedHour[] | null;
  customByMonth: Map<string, CustomHour[]>; // key: "2025-11"
}

const cache: Cache = {
  general: null,
  blocked: null,
  customByMonth: new Map(),
};

// --- Fetchers with caching ---

async function fetchGeneralHours(): Promise<GeneralHour[]> {
  const { data, error } = await supabase.from("general_hours").select("*");
  if (error) {
    console.error("Supabase error fetching general_hours:", error);
    throw error;
  }
  cache.general = data;
  return data;
}

async function fetchBlockedHours(): Promise<BlockedHour[]> {
  const { data, error } = await supabase.from("blocked_hours").select("*");
  if (error) {
    console.error("Supabase error fetching blocked_hours:", error);
    throw error;
  }
  cache.blocked = data;
  return data;
}

async function fetchCustomHoursForMonth(year: number, month: number): Promise<CustomHour[]> {
  const key = `${year}-${month}`;
  if (cache.customByMonth.has(key)) {
    return cache.customByMonth.get(key)!;
  }

  // Safe: month is 0-indexed in JS, so month + 1 is correct
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0); // Last day of the month
  const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("custom_hours")
    .select("*")
    .eq("type", "day") // ← ADD THIS: only day-level overrides
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (error) {
    console.error("Supabase error fetching custom_hours for", key, ":", error);
    throw error;
  }

  cache.customByMonth.set(key, data);
  return data;
}

// --- Public API ---

export async function getGeneralHours(): Promise<GeneralHour[]> {
  return cache.general || fetchGeneralHours();
}

export async function getBlockedHours(): Promise<BlockedHour[]> {
  return cache.blocked || fetchBlockedHours();
}

export async function getCustomHoursForDate(dateStr: string): Promise<CustomHour | null> {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthData = await fetchCustomHoursForMonth(year, month);
  return monthData.find(c => c.date === dateStr) || null;
}

export async function getCustomHoursForMonth(year: number, month: number): Promise<CustomHour[]> {
  return fetchCustomHoursForMonth(year, month);
}

// Optional: Clear cache (e.g. after admin update)
export function clearWorkingHoursCache() {
  cache.general = null;
  cache.blocked = null;
  cache.customByMonth.clear();
}