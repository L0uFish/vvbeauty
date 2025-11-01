"use client";

import React, { useState } from "react";

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export default function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Navigation
  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstWeekday = firstDayOfMonth.getDay() || 7; // 1=Mon ... 7=Sun
  const totalDays = lastDayOfMonth.getDate();

  // Calculate previous month details
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Build the full 6-week grid (42 cells)
  const days: { date: Date; isCurrent: boolean }[] = [];

  // Previous month's overflow
  for (let i = firstWeekday - 2; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date: d, isCurrent: false });
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    days.push({ date: new Date(year, month, d), isCurrent: true });
  }

  // Next month overflow (to make total 42)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrent: false });
  }

  const monthName = currentMonth.toLocaleDateString("nl-BE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar-wrapper">
      {/* Month header */}
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)} className="month-nav">
          ←
        </button>
        <h3 className="month-title">{monthName}</h3>
        <button onClick={() => changeMonth(1)} className="month-nav">
          →
        </button>
      </div>

      {/* Weekday names */}
      <div className="calendar-weekdays">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="calendar-grid">
        {days.map(({ date, isCurrent }) => {
          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const isSelected = selectedDate === iso;
          const isToday =
            date.toDateString() === new Date().toDateString();

          return (
            <button
              key={iso}
              onClick={() => isCurrent && onSelectDate(iso)}
              disabled={!isCurrent}
              className={`calendar-cell
                ${isSelected ? "selected" : ""}
                ${isToday ? "today" : ""}
                ${!isCurrent ? "out-month" : ""}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
