"use client";

import React from "react";

interface TimeslotsProps {
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export default function Timeslots({ selectedTime, onSelectTime }: TimeslotsProps) {
  const times = [
    "09:00", "09:30", "10:00", "10:30", "11:00",
    "13:00", "13:30", "14:00", "14:30", "15:00",
  ];

  return (
    <div className="timeslot-grid">
      {times.map((time) => {
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
