"use client";

import { useState } from "react";
import "../../styles/admin/DayView.css";
import TopBarActions from "./TopBarActions";

export default function DayView() {
  const [date, setDate] = useState(new Date());

  const handlePrevDay = () =>
    setDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  const handleNextDay = () =>
    setDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));

  const timeSlots = [];
  for (let h = 6; h <= 21; h++) {
    timeSlots.push(`${h.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${h.toString().padStart(2, "0")}:30`);
  }

  return (
    <div className="day-view-container">
      <div className="day-header">
        <button onClick={handlePrevDay}>←</button>
        <h2>
          {date.toLocaleDateString("nl-BE", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          })}
        </h2>
        <button onClick={handleNextDay}>→</button>

        <TopBarActions />
      </div>

      <div className="day-timeline">
        {timeSlots.map((t, i) => (
          <div
            key={i}
            className={`time-slot ${
              t.endsWith(":00") ? "solid" : "dotted"
            }`}
          >
            <span className="time-label">{t}</span>
            {/* Example blocks */}
            {/* <div className="slot-block blocked">Blok</div> */}
            {/* <div className="slot-block booked">Louie – Wimpers</div> */}
          </div>
        ))}
      </div>
    </div>
  );
}
