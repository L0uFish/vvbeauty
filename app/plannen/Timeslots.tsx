"use client";

import React from "react";
import { useAvailableTimes } from "@/app/hooks/useAvailableTimes";

interface TimeslotsProps {
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  service: any;
}

export default function Timeslots({
  selectedDate,
  selectedTime,
  onSelectTime,
  service,
}: TimeslotsProps) {
  const { times, loading } = useAvailableTimes(selectedDate, service);

  if (loading) return <p>⏳ Beschikbare tijden laden...</p>;
  if (times.length === 0) return <p>🚫 Geen beschikbare uren voor deze dag.</p>;

  return (
    <div className="timeslot-grid">
      {times.map((time: string) => {
        const isSelected = selectedTime === time;
        return (
          <button
            key={time}
            className={`timeslot ${isSelected ? "selected" : ""}`}
            onClick={() => onSelectTime(time)}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
