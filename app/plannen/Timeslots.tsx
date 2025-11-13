"use client";

import React from "react";
import { useTimeslotsEngine } from "@/app/hooks/useTimeslotsEngine";

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
  const { times, loading } = useTimeslotsEngine(selectedDate, service);

  if (loading) return <p>Beschikbare tijden laden...</p>;

  if (times.length === 0) {
    return (
      <p>
        Geen beschikbare uren voor deze dag.
      </p>
    );
  }

  return (
    <div className="timeslot-grid">
      {times.map((time) => (
        <button
          key={time}
          onClick={() => onSelectTime(time)}
          className={`timeslot ${selectedTime === time ? "selected" : ""}`}
        >
          {time}
        </button>
      ))}
    </div>
  );
}
