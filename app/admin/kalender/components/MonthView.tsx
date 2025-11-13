"use client";
import React from "react";
import {
  Appointment,
  BlockedHour,
  CustomHour,
  GeneralHour,
} from "@/app/types/scheduling";
import { getDateKey, getRecurringBlockedHours } from "@/app/utils/date";

export default function MonthView({
  date,
  appts,
  blocks,
  customHours,
  generalHours,
  showCancelled,
  isClosedDay,
  onSelectDay,
}: {
  date: Date;
  appts: Appointment[];
  blocks: BlockedHour[];
  customHours: CustomHour[];
  generalHours: GeneralHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;
  onSelectDay: (d: Date) => void;
}) {
  const y = date.getFullYear();
  const m = date.getMonth();

  const first = new Date(y, m, 1);

  // Monday-start grid
  const start = new Date(first);
  const offset = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - offset);

  // 6-week full grid (42 cells)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  // Map appointments by date
  const byDay = new Map<string, { appts: Appointment[] }>();
  for (const c of cells) byDay.set(getDateKey(c), { appts: [] });

  for (const a of appts) {
    if (a.status === "cancelled" && !showCancelled) continue;
    byDay.get(a.date)?.appts.push(a);
  }

  const getCustomForDate = (d: Date) => {
    const key = getDateKey(d);
    return customHours.find((c) => c.date === key) ?? null;
  };

  return (
    <div className="month-grid pretty">
      {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
        <div key={d} className="dow">
          {d}
        </div>
      ))}

      {cells.map((d, i) => {
        const key = getDateKey(d);
        const { appts: aps } = byDay.get(key)!;

        const out = d.getMonth() !== m;

        const bls = getRecurringBlockedHours(blocks, key, d);
        const custom = getCustomForDate(d);

        const customClosed = custom?.is_closed === true;
        const customOpen = custom && !custom.is_closed;

        const closedNormally = isClosedDay(d);
        const isClosed = customClosed || (!customOpen && closedNormally);

        // ⭐ NEW: detect today's date
        const isToday = d.toDateString() === new Date().toDateString();

        const classNames = [
          "mcell",
          out ? "out" : "",
          isClosed ? "closed" : "",
          customOpen ? "custom-open" : "",
          customClosed ? "custom-closed" : "",
          isToday ? "today" : "",   // ⭐ highlight
        ].join(" ");

        const label =
          customClosed
            ? custom?.notes
              ? `Gesloten (${custom.notes})`
              : "Gesloten"
            : customOpen
            ? `Open ${custom.open_time?.slice(0, 5)}–${custom.close_time?.slice(0, 5)}`
            : isClosed
            ? "Gesloten"
            : "";

        return (
          <div
            key={i}
            className={classNames}
            onClick={() => onSelectDay(d)}
            style={{ cursor: "pointer" }}
          >
            <div className="mdate">{d.getDate()}</div>

            {label && (
              <div
                className="mcustom-note"
                style={{
                  fontSize: "10px",
                  color: isClosed ? "#c62828" : "#4caf50",
                  marginBottom: "3px",
                }}
              >
                {label}
              </div>
            )}

            <div className="mlines">
              {aps.map((a, idx) => (
                <div
                  key={idx}
                  className={`line ${
                    a.status === "cancelled" ? "grey" : "green"
                  }`}
                  title={`${a.time} ${a.client_name} — ${a.service_name}`}
                >
                  <span className="mini-label">
                    {a.client_name?.split(" ")[0] || "—"}
                  </span>
                </div>
              ))}

              {bls.map((b, idx) => (
                <div
                  key={"b" + idx}
                  className="line red"
                  title={`Geblokkeerd: ${b.time_from}–${b.time_until}${
                    b.notes ? " (" + b.notes + ")" : ""
                  }`}
                >
                  <span className="mini-label">
                    Blok: {b.time_from.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
