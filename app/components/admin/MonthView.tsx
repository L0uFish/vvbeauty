"use client";

import { useState, useEffect } from "react";
import "../../styles/MonthView.css";
import TopBarActions from "./TopBarActions";

export default function MonthView() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // build calendar cells
  const days = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startDay + 1;
    const date = new Date(year, month, dayNum);
    const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
    days.push({ date, isCurrentMonth });
  }

  return (
    <div className="month-view-container">
      <div className="month-header">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>←</button>
        <h2>
          {currentDate.toLocaleString("default", { month: "long" })} {year}
        </h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>→</button>

        <TopBarActions />
      </div>

      <div className="month-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="day-header">{d}</div>
        ))}
        {days.map((d, i) => (
          <div
            key={i}
            className={`day-cell ${!d.isCurrentMonth ? "other-month" : ""}`}
          >
            <div className="day-number">{d.date.getDate()}</div>

            {/* placeholder for colored bars */}
            <div className="bars">
              {/* Example: */}
              {/* <div className="bar blocked"></div>
                  <div className="bar booked"></div> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
