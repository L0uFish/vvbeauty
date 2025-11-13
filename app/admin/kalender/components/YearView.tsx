"use client";

import React from "react";
import {
  Appointment,
  BlockedHour,
  CustomHour,
} from "@/app/types/scheduling";
import {
  getDateKey,
  getRecurringBlockedHours,
} from "@/app/utils/date";

export default function YearView({
  date,
  blocks,
  appts,
  customHours,
  showCancelled,
  isClosedDay,
  onSelectMonth,
  onSelectDay,
}: {
  date: Date;
  blocks: BlockedHour[];
  appts: Appointment[];
  customHours: CustomHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;

  onSelectMonth?: (monthDate: Date) => void;
  onSelectDay?: (dayDate: Date) => void;
}) {
  const year = date.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const getCustomForDate = (d: Date) => {
    const key = getDateKey(d);
    return customHours.find((ch) => ch.date === key) ?? null;
  };

  const MIN = 360; // 06:00
  const MAX = 1320; // 22:00
  const RANGE = MAX - MIN;

  return (
    <div className="year-grid heatmap">
      {months.map((m, i) => {
        const mo = m.getMonth();

        // Build 6x7 matrix starting Monday
        const first = new Date(year, mo, 1);
        const start = new Date(first);
        const offset = (first.getDay() + 6) % 7; // Monday = 0
        start.setDate(first.getDate() - offset);

        const days = Array.from({ length: 42 }, (_, j) => {
          const d = new Date(start);
          d.setDate(start.getDate() + j);
          return d;
        });

        return (
          <section key={i} className="year-month heat">
            {/* === Month header === */}
            <header
              style={{ cursor: "pointer" }}
              onClick={() => onSelectMonth?.(m)}
            >
              {m.toLocaleString("nl-BE", { month: "long" })}
            </header>

            <div className="mini-grid">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d, ii) => (
                <div key={`dow-${ii}`} className="mini-dow">
                  {d}
                </div>
              ))}

              {days.map((d, j) => {
                const key = getDateKey(d);
                const inMonth = d.getMonth() === mo;

                // === Custom hours ===
                const custom = getCustomForDate(d);
                const customClosed = custom?.is_closed === true;
                const customOpen =
                  custom &&
                  !custom.is_closed &&
                  (custom.open_time || custom.close_time);

                // === Normal status ===
                const closedNormally = isClosedDay(d);
                const isClosed =
                  customClosed || (!customOpen && closedNormally);

                // === Appointments & Blocks ===
                const dayAppts = appts.filter(
                  (a) => a.date === key && (showCancelled || a.status !== "cancelled")
                );

                const dayBlocks = getRecurringBlockedHours(blocks, key, d);

                const bars = [
                  ...dayAppts.map((a) => {
                    const duration =
                      a.service?.duration_minutes ??
                      a.duration_minutes ??
                      60;
                    const buffer =
                      a.service?.buffer_minutes ??
                      a.buffer_minutes ??
                      0;

                    const start = toMinutes(a.time);

                    return {
                      start,
                      end: start + duration + buffer,
                      color:
                        a.status === "cancelled" ? "#aaa" : "#66bb6a",
                    };
                  }),

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
                  customOpen ? "custom-open" : "",
                  customClosed ? "custom-closed" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const tooltip =
                  customClosed
                    ? custom?.notes
                      ? `Gesloten (${custom.notes})`
                      : "Gesloten"
                    : customOpen
                    ? `Open ${custom.open_time?.slice(0, 5)}–${custom.close_time?.slice(0, 5)}`
                    : isClosed
                    ? "Gesloten"
                    : bars.length
                    ? "Bezet"
                    : "Vrij";

                return (
                  <div
                    key={j}
                    className={classNames}
                    title={tooltip}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectDay?.(d)}
                  >
                    <span className="num">{d.getDate()}</span>

                    <div className="tiny-lanes">
                      {bars.map((b, k) => (
                        <div
                          key={k}
                          className="tiny-bar"
                          style={{
                            top: `${((b.start - MIN) / RANGE) * 100}%`,
                            height: `${((b.end - b.start) / RANGE) * 100}%`,
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
