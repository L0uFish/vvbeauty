"use client";
import React, { useMemo } from "react";
import { Appointment, BlockedHour, CustomHour } from "@/app/types/scheduling";
import { getDateKey, isClosedOrCustomHours, getRecurringBlockedHours } from "@/app/utils/date";

export default function DayView({
  date,
  appts,
  blocks,
  customHours,
  showCancelled,
  isClosedDay,
}: {
  date: Date;
  appts: Appointment[];
  blocks: BlockedHour[];
  customHours: CustomHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;
}) {
  const dayISO = getDateKey(date);

  // 1️⃣ Check if custom hours override a normally closed day (Custom > General)
  const customEntry = customHours.find((c) => c.date === dayISO);
  const closed = customEntry
    ? customEntry.is_closed // respect explicit custom closure
    : isClosedDay(date); // otherwise use general schedule

  const hours = Array.from({ length: 17 }, (_, i) => 6 + i);
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const dayStart = 360, // 06:00 in minutes
    dayEnd = 1320, // 22:00 in minutes
    totalRange = dayEnd - dayStart,
    timelineHeight = 960;

  // 2️⃣ Generate active recurring blocks for the current day (Blocks)
  const recurringBlocks = useMemo(() => {
    // Uses the centralized logic for single-day and recurring blocks
    return getRecurringBlockedHours(blocks, dayISO, date);
  }, [blocks, dayISO, date]);

  // 3️⃣ Merge all items (appointments + blocks + recurring)
  const items = [
    // Appointments
    ...appts
      .filter((a) => a.date === dayISO && (showCancelled || a.status !== "cancelled"))
      .map((a) => {
        const duration = a.service?.duration_minutes ?? 60;
        const buffer = a.service?.buffer_minutes ?? 0;
        const start = toMinutes(a.time);
        const end = start + duration + buffer;
        return {
          id: a.id,
          start,
          end,
          color: a.status === "cancelled" ? "#9e9e9e" : "#66bb6a",
          label: `${a.client_name} — ${a.service_name}`,
          time: a.time,
        };
      }),

    // Blocked Hours (including recurring)
    ...recurringBlocks.map((b) => ({
      id: b.id + (b.repeat_type ?? "") + b.blocked_date, // unique ID for recurring blocks
      start: toMinutes(b.time_from),
      end: toMinutes(b.time_until),
      color: "#e57373",
      label:
        b.notes ??
        (b.repeat_type && b.repeat_type !== "none"
          ? `Geblokkeerd (${b.repeat_type})`
          : "Geblokkeerd"),
      time: b.time_from,
    })),
  ];

  return (
    <div
      className={`day-grid ${closed ? "closed" : ""}`}
      style={{ display: "grid", gridTemplateColumns: "80px 1fr" }}
    >
      {/* Time ticks */}
      <div
        className="ticks"
        style={{
          position: "relative",
          height: `${timelineHeight}px`,
          borderRight: "1px dashed #ddd",
        }}
      >
        {hours.map((h) => (
          <div
            key={h}
            className="tick full"
            style={{
              position: "absolute",
              top: `${((h * 60 - dayStart) / totalRange) * 100}%`,
              height: `${(60 / totalRange) * 100}%`,
              width: "100%",
              borderBottom: "1px dashed #eee",
            }}
          >
            <span
              className="label"
              style={{
                position: "absolute",
                top: "2px",
                left: "8px",
                fontSize: "12px",
                color: "#777",
              }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Right lane */}
      <div
        className="lanes"
        style={{
          position: "relative",
          height: `${timelineHeight}px`,
          background: closed ? "#ffe8ec" : "#fff",
        }}
      >
        {closed && !customEntry && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              width: "100%",
              textAlign: "center",
              color: "#c75a6a",
              fontWeight: 600,
              fontSize: "1.1rem",
              opacity: 0.8,
            }}
          >
            GESLOTEN
          </div>
        )}

        {items.map((it) => {
          const top = ((it.start - dayStart) / totalRange) * 100;
          const height = ((it.end - it.start) / totalRange) * 100;
          return (
            <div
              key={it.id}
              className="bar"
              style={{
                position: "absolute",
                top: `${top}%`,
                height: `${height}%`,
                left: "8px",
                right: "8px",
                borderRadius: "6px",
                background: it.color,
                color: "#fff",
                padding: "6px 8px",
                fontSize: "12px",
              }}
            >
              <div
                className="bar-time"
                style={{ fontWeight: 600, fontSize: "11px", marginBottom: 2 }}
              >
                {it.time}
              </div>
              <div className="bar-label">{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}