"use client";

import React, { useMemo, useState } from "react";
import { Appointment, BlockedHour, CustomHour, GeneralHour } from "@/app/types/scheduling";
import { getDateKey, getRecurringBlockedHours } from "@/app/utils/date";
import EditAppointmentModal from "./EditAppointmentModal";
import EditBlockHoursModal from "./EditBlockHoursModal";

export default function DayView({
  date,
  appts,
  blocks,
  customHours,
  generalHours,
  showCancelled,
  isClosedDay,
  onAppointmentUpdated,
}: {
  date: Date;
  appts: Appointment[];
  blocks: BlockedHour[];
  customHours: CustomHour[];
  generalHours: GeneralHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;
  onAppointmentUpdated?: () => void;
}) {
  const dayISO = getDateKey(date);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const handleAppointmentClick = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setEditOpen(true);
  };

  const customEntry = customHours.find((c) => c.date === dayISO);
  const closed = customEntry ? customEntry.is_closed : isClosedDay(date);

  const hours = Array.from({ length: 17 }, (_, i) => 6 + i);
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const dayStart = 360; // 06:00
  const dayEnd = 1320; // 22:00
  const totalRange = dayEnd - dayStart;
  const timelineHeight = 960;

  const [editBlockOpen, setEditBlockOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);

  const recurringBlocks = useMemo(() => {
    return getRecurringBlockedHours(blocks, dayISO, date);
  }, [blocks, dayISO, date]);

  const items = [
    ...appts
      .filter(
        (a) => a.date === dayISO && (showCancelled || a.status !== "cancelled")
      )
      .map((a) => {
        const duration = a.service?.duration_minutes ?? a.duration_minutes ?? 60;
        const buffer = a.service?.buffer_minutes ?? a.buffer_minutes ?? 0;
        const start = toMinutes(a.time);
        const end = start + duration + buffer;

        return {
          kind: "appt" as const,
          id: a.id,
          appt: a,
          start,
          end,
          color: a.status === "cancelled" ? "#9e9e9e" : "#66bb6a",
          label: `${a.client_name} — ${a.service_name}`,
          time: a.time,
        };
      }),

    ...recurringBlocks.map((b) => ({
      kind: "block" as const,
      id: b.id + (b.repeat_type ?? "") + b.blocked_date,
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
    <>
      <div
        className={`day-grid ${closed ? "closed" : ""}`}
        style={{ display: "grid", gridTemplateColumns: "80px 1fr" }}
      >
        {/* LEFT COLUMN */}
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

        {/* RIGHT COLUMN */}
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
                onClick={() => {
                  if (it.kind === "block") {
                    const block = blocks.find(b => it.id.startsWith(b.id));
                    setSelectedBlock(block || null);
                    setEditBlockOpen(true);
                  }
                  if (it.kind === "appt") handleAppointmentClick(it.appt);
                }}
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
                  cursor: it.kind === "appt" ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "11px",
                    marginBottom: 2,
                  }}
                >
                  {it.time}
                </div>
                <div>{it.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT MODAL */}
      <EditAppointmentModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onUpdated={onAppointmentUpdated}
        generalHours={generalHours}
        customHours={customHours}
        blockedHours={blocks}
      />
      {editBlockOpen && (
      <EditBlockHoursModal
        open={editBlockOpen}
        onClose={() => {
          setEditBlockOpen(false);
          setSelectedBlock(null);
        }}
        block={selectedBlock}
        onUpdated={onAppointmentUpdated} // refresh calendar
      />
    )}
    </>
  );
}
