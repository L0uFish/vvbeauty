// app/admin/kalender/components/MonthView.tsx
"use client";
import React from "react";
import { Appointment, BlockedHour, CustomHour } from "@/app/types/scheduling";
import { getDateKey, getRecurringBlockedHours } from "@/app/utils/date";

export default function MonthView({
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
  customHours?: CustomHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;
}) {
  const y = date.getFullYear();
  const m = date.getMonth();

  const first = new Date(y, m, 1);
  const start = new Date(first);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  start.setDate(first.getDate() - offset);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const byDay = new Map<string, { appts: Appointment[] }>();
  for (const c of cells) byDay.set(getDateKey(c), { appts: [] });

  for (const a of appts) {
    if (a.status === "cancelled" && !showCancelled) continue;
    byDay.get(a.date)?.appts.push(a);
  }

  const getCustomForDate = (d: Date) => {
    const key = getDateKey(d);
    return customHours?.find((ch) => ch.date === key) ?? null;
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
        const closedNormally = isClosedDay(d);
        const isCustomClosed = custom?.is_closed === true;
        const isCustomOpen = custom && !custom.is_closed && (custom.open_time || custom.close_time);
        const isClosed = isCustomClosed || (!isCustomOpen && closedNormally);

        const classNames = [
          "mcell",
          out ? "out" : "",
          isClosed ? "closed" : "",
          isCustomOpen ? "custom-open" : "",
          isCustomClosed ? "custom-closed" : "",
        ].join(" ");

        const label =
          isCustomClosed
            ? custom?.notes
              ? `Gesloten (${custom.notes})`
              : "Gesloten"
            : isCustomOpen
            ? `Open ${custom.open_time?.slice(0, 5)}–${custom.close_time?.slice(0, 5)}`
            : isClosed
            ? "Gesloten"
            : "";

        return (
          <div key={i} className={classNames}>
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
                  className={`line ${a.status === "cancelled" ? "grey" : "green"}`}
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
                  title={`Geblokkeerd: ${b.time_from}–${b.time_until}${b.notes ? " (" + b.notes + ")" : ""}`}
                >
                  <span className="mini-label">Blok: {b.time_from.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}