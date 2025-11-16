"use client";
import React, { useRef, useState } from "react";
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
  onOpenDayActions,
  onBatchCustom,
  onBatchBlock,
  onBatchReset,
}: {
  date: Date;
  appts: Appointment[];
  blocks: BlockedHour[];
  customHours: CustomHour[];
  generalHours: GeneralHour[];
  showCancelled: boolean;
  isClosedDay: (d: Date) => boolean;
  onOpenDayActions: (d: Date) => void;

  // ⭐ NEW – used for multi-select confirm
  onBatchCustom?: (dates: string[]) => void;
  onBatchBlock?: (dates: string[]) => void;
  onBatchReset?: (dates: string[]) => void;
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

  /* ------------------------------------------------------------------ */
  /*  MULTI-SELECT + LONG PRESS                                         */
  /* ------------------------------------------------------------------ */

  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showChoice, setShowChoice] = useState(false);

  const LONG_PRESS_MS = 420;
  const MOVE_THRESHOLD = 10;

  const holdTimer = useRef<number | null>(null);
  const downPos = useRef({ x: 0, y: 0 });
  const longPressTriggered = useRef(false);

  // drag state
  const isDragging = useRef(false);
  const dragStartKey = useRef<string | null>(null);
  const dragHadMovement = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const addKey = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const exitMultiMode = () => {
    setSelectMode(false);
    setSelectedKeys([]);
    setShowChoice(false);
  };

  const handlePointerDown =
    (d: Date) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const key = getDateKey(d);

      isDragging.current = true;
      dragStartKey.current = key;
      dragHadMovement.current = false;
      longPressTriggered.current = false;

      downPos.current = { x: e.clientX, y: e.clientY };

      clearHoldTimer();
      holdTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        // Long press always (re)starts a new selection on that day
        setSelectMode(true);
        setSelectedKeys([key]);
      }, LONG_PRESS_MS);
    };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const dx = Math.abs(e.clientX - downPos.current.x);
    const dy = Math.abs(e.clientY - downPos.current.y);

    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      dragHadMovement.current = true;
      // user is moving/scrolling → cancel pending long-press
      clearHoldTimer();
    }
  };

  const handlePointerEnter =
    (d: Date) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!selectMode || !isDragging.current) return;

      const key = getDateKey(d);

      if (dragStartKey.current && key !== dragStartKey.current) {
        dragHadMovement.current = true;
      }

      // Drag selection → keep adding
      addKey(key);
    };

  const handlePointerUp =
    (d: Date) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const key = getDateKey(d);

      const wasLongPress = longPressTriggered.current;
      const hadMovement = dragHadMovement.current;
      const wasInSelectMode = selectMode;

      isDragging.current = false;
      dragStartKey.current = null;
      dragHadMovement.current = false;
      longPressTriggered.current = false;
      clearHoldTimer();

      // If long-press started selection, do nothing else on release
      if (wasLongPress) return;

      // Already in multi-select mode
      if (wasInSelectMode) {
        if (hadMovement) {
          // drag selection → ensure last cell is selected
          addKey(key);
        } else {
          // simple click → toggle just that day
          toggleKey(key);
        }
        return;
      }

      // Not in select mode: treat as scroll if moved, otherwise as a normal tap
      if (hadMovement) {
        return;
      }

      setTimeout(() => onOpenDayActions(d), 40);
    };


  const handleCancelSelection = () => {
    exitMultiMode();
  };

  const handleConfirmSelection = () => {
    if (selectedKeys.length === 0) {
      exitMultiMode();
      return;
    }
    setShowChoice(true);
  };

  const handleChoiceBlock = () => {
    if (onBatchBlock) {
      onBatchBlock([...selectedKeys].sort());
    }
    exitMultiMode();
  };

  const handleChoiceCustom = () => {
    if (onBatchCustom) {
      onBatchCustom([...selectedKeys].sort());
    }
    exitMultiMode();
  };

  const handleChoiceReset = () => {
    if (onBatchReset) {
      onBatchReset([...selectedKeys].sort());
    }
    exitMultiMode();
  };

  const selectedCount = selectedKeys.length;

  

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div className="month-view-wrapper" style={{ position: "relative" }}>
      <div
        className={`month-grid pretty ${selectMode ? "multi-mode" : ""}`}
      >
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
          <div key={d} className="dow">
            {d}
          </div>
        ))}

        {cells.map((d, i) => {
          const key = getDateKey(d);
          const { appts: aps } = byDay.get(key)!;

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const isPast = d.getTime() < todayStart.getTime();
          const out = d.getMonth() !== m;

          const bls = getRecurringBlockedHours(blocks, key, d);
          const custom = getCustomForDate(d);

          const customClosed = custom?.is_closed === true;
          const customOpen = custom && !custom.is_closed;

          const closedNormally = isClosedDay(d);
          const isClosed = customClosed || (!customOpen && closedNormally);

          const isToday = d.toDateString() === new Date().toDateString();
          const isSelected = selectedKeys.includes(key);

          const classNames = [
            "mcell",
            out ? "out" : "",
            isClosed ? "closed" : "",
            customOpen ? "custom-open" : "",
            customClosed ? "custom-closed" : "",
            isToday ? "today" : "",
            isPast ? "past" : "",
            selectMode && isSelected ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const label =
            customClosed
              ? custom?.notes
                ? `Gesloten (${custom.notes})`
                : "Gesloten"
              : customOpen
              ? `Open ${custom.open_time?.slice(0, 5)}–${custom.close_time?.slice(
                  0,
                  5
                )}`
              : isClosed
              ? "Gesloten"
              : "";

          return (
            <div
              key={i}
              className={classNames}
              onPointerDown={handlePointerDown(d)}
              onPointerUp={handlePointerUp(d)}
              onPointerEnter={handlePointerEnter(d)}
              onPointerMove={handlePointerMove}
              style={{
                cursor: "pointer",
                position: "relative",
                userSelect: "none",
                // Fading non-selected while in selection mode (kept inline as it's dynamic)
                opacity: selectMode && !isSelected ? 0.45 : 1,
                // REMOVED: border and boxShadow for isSelected (moved to CSS)
                transition: "opacity 0.15s, box-shadow 0.15s, border 0.15s",
              }}
            >
              {/* Day number */}
              <div className="mdate">{d.getDate()}</div>

              {/* Small checkmark when selected */}
              {selectMode && isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: "999px",
                    // Simplified gradient for clarity
                    background: "linear-gradient(135deg, var(--vv-primary), var(--vv-accent))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  
                </div>
              )}
              {/* Custom-hours label */}
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

              {/* Appointments & blocks summary strips */}
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

      {/* -------------------------------------------------------------- */}
      {/*  MULTI-SELECT TOOLBAR (CHECK / CROSS)                          */}
      {/* -------------------------------------------------------------- */}
      {selectMode && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {/* Cancel */}
          <button
            type="button"
            onClick={handleCancelSelection}
            aria-label="Selectie annuleren"
            style={{
              width: 34,
              height: 34,
              borderRadius: "999px",
              border: "1px solid var(--vv-border)",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          {/* Confirm */}
          <button
            type="button"
            onClick={handleConfirmSelection}
            aria-label="Selectie bevestigen"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "999px",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ✓
            </span>
            {selectedCount === 0
              ? "Geen datums"
              : `${selectedCount} dag${selectedCount > 1 ? "en" : ""}`}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  CHOICE POPUP: BLOCK vs CUSTOM HOURS + RESET                   */}
      {/* -------------------------------------------------------------- */}
      {showChoice && (
        <div
          onClick={() => setShowChoice(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 90,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(90vw,420px)",
              background: "#fff",
              borderRadius: 18,
              padding: 22,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              fontFamily: "var(--font-main)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: 8,
                textAlign: "center",
                fontFamily: "var(--font-title)",
                color: "var(--vv-primary)",
              }}
            >
              Voor deze datums, wat wil je doen?
            </h3>

            <p style={{ fontSize: "0.9rem", textAlign: "center" }}>
              Je hebt{" "}
              <strong>
                {selectedCount} dag{selectedCount > 1 ? "en" : ""} geselecteerd
              </strong>
              .
            </p>

            <div
              style={{
                maxHeight: 120,
                overflowY: "auto",
                padding: "6px 10px",
                borderRadius: 10,
                background: "#faf5f7",
                fontSize: "0.85rem",
              }}
            >
              {selectedKeys
                .slice()
                .sort()
                .map((k) => (
                  <div key={k}>• {new Date(k).toLocaleDateString("nl-BE")}</div>
                ))}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 10,
              }}
            >
              {/* Zelfde style: openingsuren wijzigen */}
              <button
                type="button"
                onClick={handleChoiceCustom}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Openingsuren wijzigen
              </button>

              {/* Zelfde style: uren blokkeren */}
              <button
                type="button"
                onClick={handleChoiceBlock}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Uren blokkeren
              </button>

              {/* Reset naar standaard (subtiele grey) */}
              <button
                type="button"
                onClick={handleChoiceReset}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#f5f5f5",
                  color: "#444",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Reset naar standaard
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowChoice(false);
              }}
              style={{
                marginTop: 6,
                alignSelf: "center",
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "#eee",
                color: "#555",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Alleen selectie behouden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
