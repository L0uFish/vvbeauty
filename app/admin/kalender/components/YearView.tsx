// app/admin/kalender/components/YearView.tsx
"use client";
import React from "react";
import { Appointment, BlockedHour, CustomHour } from "@/app/types/scheduling";
import { getDateKey, getRecurringBlockedHours } from "@/app/utils/date";

export default function YearView({
  date,
  blocks,
  appts,
  customHours,
  showCancelled,
  isClosedDay,
}: {
  date: Date;
  blocks: BlockedHour[];
  appts: Appointment[];
  customHours?: CustomHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;
}) {
  const year = date.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const getCustomForDate = (d: Date) => {
    const key = getDateKey(d);
    return customHours?.find((ch) => ch.date === key) ?? null;
  };

  const MIN_TIME = 360; // 6:00
  const MAX_TIME = 1320; // 22:00
  const TOTAL_DAY_MINUTES = MAX_TIME - MIN_TIME;

  return (
    <div className="year-grid heatmap">
      {months.map((m, i) => {
        const mo = m.getMonth();
        const first = new Date(year, mo, 1);
        const start = new Date(first);
        const offset = (first.getDay() + 6) % 7;
        start.setDate(first.getDate() - offset);

        const days = Array.from({ length: 42 }, (_, j) => {
          const d = new Date(start);
          d.setDate(start.getDate() + j);
          return d;
        });

        return (
          <section key={i} className="year-month heat">
            <header>{m.toLocaleString("nl-BE", { month: "long" })}</header>
            <div className="mini-grid">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d, i2) => (
                <div key={`dow-${i2}`} className="mini-dow">
                  {d}
                </div>
              ))}

              {days.map((d, j) => {
                const key = getDateKey(d);
                const inMonth = d.getMonth() === mo;

                const custom = getCustomForDate(d);
                const closedNormally = isClosedDay(d);
                const isCustomClosed = custom?.is_closed === true;
                const isCustomOpen = custom && !custom.is_closed && (custom.open_time || custom.close_time);
                const isClosed = isCustomClosed || (!isCustomOpen && closedNormally);

                const dayAppts = appts.filter(
                  (a) => a.date === key && (showCancelled || a.status !== "cancelled")
                );

                const dayBlocks = getRecurringBlockedHours(blocks, key, d);

                const bars = [
                  ...dayAppts.map((a) => ({
                    start: toMinutes(a.time),
                    end: toMinutes(a.time) + (a.service?.duration_minutes ?? 60) + (a.service?.buffer_minutes ?? 0),
                    color: a.status === "cancelled" ? "#aaa" : "#66bb6a",
                  })),
                  ...dayBlocks.map((b) => ({
                    start: toMinutes(b.time_from),
                    end: toMinutes(b.time_until),
                    color: "#e57373",
                  })),
                ];

                const classNames = [
                  "mini-day",
                  inMonth ? "" : "out",
                  isClosed ? "closed" : "",
                  isCustomOpen ? "custom-open" : "",
                  isCustomClosed ? "custom-closed" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const tooltip =
                  isCustomClosed
                    ? custom?.notes
                      ? `Gesloten (${custom.notes})`
                      : "Gesloten"
                    : isCustomOpen
                    ? `Open ${custom.open_time?.slice(0, 5)}–${custom.close_time?.slice(0, 5)}`
                    : isClosed
                    ? "Gesloten"
                    : bars.length
                    ? "Bezet"
                    : "Vrij";

                return (
                  <div key={j} className={classNames} title={tooltip}>
                    <span className="num">{d.getDate()}</span>
                    <div className="tiny-lanes">
                      {bars.map((b, k) => (
                        <div
                          key={k}
                          className="tiny-bar"
                          style={{
                            top: `${((b.start - MIN_TIME) / TOTAL_DAY_MINUTES) * 100}%`,
                            height: `${((b.end - b.start) / TOTAL_DAY_MINUTES) * 100}%`,
                            background: b.color,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}