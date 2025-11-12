// app/components/Timeslots.tsx
"use client";

import React from "react";
import { useAvailableTimes } from "../hooks/useAvailableTimes";

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

  // DEBUG LOGGING — FULL TRACE
  console.group("Timeslots Debug — " + new Date().toLocaleTimeString());
  console.log("Input:", {
    selectedDate,
    serviceId: service?.id,
    serviceName: service?.name,
  });

  console.log("Service Data:", {
    hasGeneralHours: !!service?.generalHours?.length,
    generalHoursCount: service?.generalHours?.length || 0,
    generalHours: service?.generalHours,
    hasCustomHours: !!service?.customHours?.length,
    customHoursCount: service?.customHours?.length || 0,
    customHours: service?.customHours,
    duration_minutes: service?.duration_minutes,
    buffer_minutes: service?.buffer_minutes,
  });

  if (selectedDate) {
    const weekday = new Date(selectedDate)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const general = service?.generalHours?.find((h: any) => h.weekday === weekday);
    const custom = service?.customHours?.find((h: any) => h.date === selectedDate);

    console.log("Day Logic:", {
      selectedDate,
      weekday,
      generalHour: general,
      customHour: custom,
      isGeneralClosed: general?.is_closed,
      isCustomClosed: custom?.is_closed,
    });
  }

  console.log("Hook Result:", {
    loading,
    timesCount: times.length,
    times,
  });
  console.groupEnd();

  if (loading) {
    return <p>Beschikbare tijden laden...</p>;
  }

  if (times.length === 0) {
    return (
      <p>
        Geen beschikbare uren voor deze dag.{" "}
        <span style={{ fontSize: "0.8em", color: "#666" }}>
          (Zie console voor details)
        </span>
      </p>
    );
  }

  return (
    <div className="timeslot-grid">
      {times.map((time) => {
        const isSelected = selectedTime === time;
        return (
          <button
            key={time}
            onClick={() => onSelectTime(time)}
            className={`timeslot ${isSelected ? "selected" : ""}`}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}