"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import GeneralHoursModal from "./GeneralHoursModal";
import OverrideModal from "./OverrideModal";
import BlockedHourModal from "./BlockedHourModal"; // ✅ new import
import "../../styles/admin/AvailabilityManager.css";


const normalize = (data: any[]) =>
  data.map((entry) => {
    let parsedDate = null;
    if (entry.date) {
      parsedDate = new Date(entry.date);
      parsedDate.setHours(0, 0, 0, 0);
    }
    return { ...entry, parsedDate };
  });

export default function AvailabilityManager() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [customHours, setCustomHours] = useState<any[]>([]);
  const [generalHours, setGeneralHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedHours, setBlockedHours] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const dragStart = useRef<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [customRes, generalRes, blockedRes] = await Promise.all([
        supabase.from("custom_hours").select("*").eq("year", year),
        supabase.from("general_hours").select("*"),
        supabase
          .from("blocked_hours")
          .select("*")
          .gte("blocked_date", `${year}-01-01`)
          .lte("blocked_date", `${year}-12-31`)
          .order("blocked_date", { ascending: true }),
      ]);

      if (customRes.error)
        console.error("Error fetching custom_hours:", customRes.error);
      if (generalRes.error)
        console.error("Error fetching general_hours:", generalRes.error);
      if (blockedRes.error)
        console.error("Error fetching blocked_hours:", blockedRes.error);

      setCustomHours(normalize(customRes.data || []));
      setGeneralHours(generalRes.data || []);
      setBlockedHours(blockedRes.data || []);
    } catch (err) {
      console.error("Unexpected fetch error:", err);
    }

    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [year, fetchData]);

  const months = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December",
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getWeekdayName = (date: Date) =>
    date.toLocaleString("en-US", { weekday: "long" }).toLowerCase();

  const isDayClosed = (date: Date) => {
    const custom = customHours.find((h) => h.parsedDate?.toDateString() === date.toDateString());
    if (custom) return custom.is_closed;

    const weekday = getWeekdayName(date);
    const general = generalHours.find((h) => h.weekday === weekday);
    return general?.is_closed ?? false;
  };

  const isCustomDay = (date: Date) => {
    return customHours.some((h) => h.parsedDate?.toDateString() === date.toDateString());
  };

  // CORRECT: Monday-first, 42 days, no gaps
  const generateMonthDays = (monthIndex: number, year: number) => {
    const days: { date: Date; current: boolean }[] = [];
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);

    // Start on Monday
    const firstDay = first.getDay(); // 0=Sun, 1=Mon, ...
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const start = new Date(year, monthIndex, first.getDate() - startOffset);

    // End on Sunday
    const lastDay = last.getDay();
    const endOffset = lastDay === 0 ? 0 : 7 - lastDay;
    const end = new Date(year, monthIndex, last.getDate() + endOffset);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        date: new Date(d),
        current: d.getMonth() === monthIndex,
      });
    }

    return days;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDays([date]);
    setShowOverrideModal(true);
  };

  const handleMonthClick = (monthIndex: number) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    setSelectedDays(days);
    setShowOverrideModal(true);
  };

  const handleMouseDown = (date: Date) => {
    setIsSelecting(true);
    dragStart.current = date;
    setSelectedDays([date]);
  };

  const handleDeleteBlocked = async (id: string) => {
  if (!confirm("Weet je zeker dat je dit geblokkeerd uur wil verwijderen?")) return;

  const { error } = await supabase.from("blocked_hours").delete().eq("id", id);

  if (error) {
    console.error("Error deleting blocked hour:", error);
    alert("Er is iets misgegaan bij het verwijderen.");
    return;
  }

  // Update state locally without refetch
  setBlockedHours((prev) => prev.filter((b) => b.id !== id));
};

  const handleMouseEnter = (date: Date) => {
    if (!isSelecting || !dragStart.current) return;
    const start = dragStart.current < date ? dragStart.current : date;
    const end = dragStart.current > date ? dragStart.current : date;

    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    setSelectedDays(days);
  };

  const handleMouseUp = () => {
    if (isSelecting && selectedDays.length > 1) {
      setShowOverrideModal(true);
    }
    setIsSelecting(false);
    dragStart.current = null;
  };

  if (loading) return <p>Even geduld...</p>;

  return (
    <div className="availability-manager" onMouseUp={handleMouseUp}>
      <div className="availability-header">
        <h2>Beschikbaarheid Instellen</h2>
        <div className="year-selector">
          <button onClick={() => setYear((y) => y - 1)}>Previous</button>
          <span>{year}</span>
          <button onClick={() => setYear((y) => y + 1)}>Next</button>

          <button
            style={{
              marginLeft: "1rem",
              backgroundColor: "#b23561",
              color: "white",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setShowBlockedModal(true)}
          >
            Uren Blokkeren
          </button>

          <button
            style={{
              marginLeft: "0.5rem",
              backgroundColor: "#b23561",
              color: "white",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setShowGeneralModal(true)}
          >
            Algemene Uren
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {months.map((month, monthIndex) => {
          const days = generateMonthDays(monthIndex, year);
          return (
            <div className="month-box" key={month}>
              <h3 onClick={() => handleMonthClick(monthIndex)}>{month}</h3>

              <div className="days-grid">
                {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d, i) => (
                  <div key={`weekday-${month}-${i}`} className="weekday-header">
                    {d}
                  </div>
                ))}

                {days.map(({ date, current }) => {
                  const closed = isDayClosed(date);
                  const isPast = date < today;
                  const isCustom = isCustomDay(date);
                  const isSelected = selectedDays.some(
                    (d) => d.toDateString() === date.toDateString()
                  );

                  return (
                    <div
                      key={date.toISOString()}
                      className={`day-box 
                        ${!current ? "faded" : ""} 
                        ${closed ? "closed" : ""} 
                        ${isCustom && !closed ? "custom" : ""} 
                        ${isPast ? "past" : ""}
                        ${isSelected ? "selected" : ""}`}
                      onMouseDown={() => handleMouseDown(date)}
                      onMouseEnter={() => handleMouseEnter(date)}
                      onClick={() => handleDayClick(date)}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="blocked-hours-list">
        {blockedHours.map((entry) => (
          <div key={entry.id} className="blocked-hour-card">
            <div className="blocked-hour-info">
              <div className="blocked-date">
                {new Date(entry.blocked_date).toLocaleDateString("nl-BE", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="blocked-time">
                {entry.time_from.slice(0, 5)} – {entry.time_until.slice(0, 5)}
              </div>
              {entry.notes && <div className="blocked-note">{entry.notes}</div>}
            </div>

            <button
              className="delete-blocked-btn"
              onClick={() => handleDeleteBlocked(entry.id)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {showGeneralModal && (
        <GeneralHoursModal
          open={showGeneralModal}
          onClose={() => setShowGeneralModal(false)}
          selectedDays={selectedDays}
          onSaved={() => {
            setShowGeneralModal(false);
            fetchData();
          }}
        />
      )}

      {showBlockedModal && (
        <BlockedHourModal
          open={showBlockedModal}
          onClose={() => setShowBlockedModal(false)}
          onSaved={() => {
            setShowBlockedModal(false);
            fetchData();
          }}
        />
      )}

      {showOverrideModal && (
        <OverrideModal
          open={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          selectedDays={selectedDays}
          onSaved={() => {
            setShowOverrideModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}