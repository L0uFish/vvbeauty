"use client";

import React, { useMemo, useState } from "react";
import { Appointment, BlockedHour } from "@/app/types/scheduling";

// Convert HH:MM to minutes
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function ListView({
  appts,
  blocks,
  showCancelled,
  onEdit,
  onEditBlock,
}: {
  appts: Appointment[];
  blocks: BlockedHour[];
  showCancelled: boolean;
  onEdit: (appt: Appointment) => void;
  onEditBlock: (block: BlockedHour) => void;
}) {
  const [includeBlocks, setIncludeBlocks] = useState(true);

  // Only future items
  const todayISO = new Date().toISOString().slice(0, 10);

  const combined = useMemo(() => {
    const items: any[] = [];

    // --- Add APPOINTMENTS ---
    for (const a of appts) {
      if (a.date < todayISO) continue;
      if (a.status === "cancelled" && !showCancelled) continue;

      items.push({
        type: "appointment",
        id: a.id,
        date: a.date,
        start: a.time.slice(0, 5),
        client: a.client_name,
        service: a.service_name,
        duration: a.service?.duration_minutes ?? 0,
        buffer: a.service?.buffer_minutes ?? 0,
        status: a.status,
        original: a,             // ⭐ keep full appointment for editing
      });
    }

    // --- Add BLOCKS ---
    if (includeBlocks) {
      for (const b of blocks) {
        if (b.blocked_date < todayISO) continue;

        items.push({
          type: "block",
          id: b.id,
          date: b.blocked_date,
          start: b.time_from.slice(0, 5),
          end: b.time_until.slice(0, 5),
          notes: b.notes ?? "",
          original: b,
        });
      }
    }

    return items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.start < b.start ? -1 : 1;
    });
  }, [appts, blocks, includeBlocks, showCancelled]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of combined) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return map;
  }, [combined]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-BE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div style={{ padding: "12px" }}>
      {/* Toggle for blocks */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          fontWeight: 500,
        }}
      >
        <input
          type="checkbox"
          checked={includeBlocks}
          onChange={(e) => setIncludeBlocks(e.target.checked)}
        />
        Geblokkeerde uren tonen
      </label>

      {/* Grouped list */}
      {Array.from(grouped.entries()).map(([date, items]) => (
        <div
          key={date}
          style={{
            marginBottom: 32,
            padding: "16px",
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              fontFamily: "var(--font-title)",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "var(--vv-primary)",
              borderBottom: "2px solid var(--vv-accent)",
              paddingBottom: 6,
              marginBottom: 14,
            }}
          >
            📅 {formatDate(date)}
          </div>

          {/* Items */}
          {items.map((item) => {
            // Appointment
            if (item.type === "appointment") {
              const isCancelled = item.status === "cancelled";

              return (
                <div
                  key={item.id}
                  onClick={() => onEdit(item.original)}   // ⭐ open edit modal
                  style={{
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 12,
                    background: isCancelled
                      ? "#eeeeee"
                      : "rgba(102,187,106,0.18)",
                    border: isCancelled
                      ? "1px solid #bdbdbd"
                      : "1px solid rgba(102,187,106,0.4)",
                    opacity: isCancelled ? 0.7 : 1,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 4,
                      fontSize: "0.95rem",
                    }}
                  >
                    {item.start} — {item.client}
                  </div>

                  <div style={{ fontSize: "0.9rem" }}>
                    {item.service} • {item.duration} min
                  </div>
                </div>
              );
            }

            // Block
            return (
                <div
                    key={item.id}
                    onClick={() => onEditBlock(item.original)}   // ⭐ pass block to modal
                    style={{
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 12,
                    background: "rgba(229,57,53,0.18)",
                    border: "1px solid rgba(229,57,53,0.4)",
                    cursor: "pointer",
                    }}
                >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 4,
                    fontSize: "0.95rem",
                    color: "#c62828",
                  }}
                >
                  🛑 Blok: {item.start}–{item.end}
                </div>

                {item.notes && (
                  <div style={{ fontSize: "0.9rem", color: "#444" }}>
                    {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
