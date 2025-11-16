"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState, useMemo, useEffect } from "react";

type RepeatType = "none" | "weekly" | "monthly" | "yearly";

type Interval = {
  start: number; // minutes since 00:00
  end: number;
  notes: string | null;
  repeat_type: RepeatType | string;
};

/* ----------------- TIME HELPERS ----------------- */

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (!intervals.length) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];

    if (!last || current.start > last.end) {
      // no overlap → just push
      merged.push({ ...current });
    } else {
      // overlap → extend end; keep meta (notes/repeat_type) from first interval
      last.end = Math.max(last.end, current.end);
      if (!last.notes && current.notes) {
        last.notes = current.notes;
      }
    }
  }

  return merged;
}

/* ------------------------------------------------ */

export default function BlockHoursModal({
  open,
  onClose,
  onSaved,
  initialDate,
  initialDates,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialDate?: string;
  initialDates?: string[];
}) {
  const [mode, setMode] = useState<"range" | "individual">("range");
  const [dates, setDates] = useState<string[]>([""]);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeUntil, setTimeUntil] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [repeatType, setRepeatType] = useState<RepeatType>("none");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [finalDates, setFinalDates] = useState<string[]>([]);

  // ✅ Locked dates: either multi-selection or single date
  const lockedDates: string[] | null =
    initialDates && initialDates.length
      ? initialDates
      : initialDate
      ? [initialDate]
      : null;

  // Prefill & lock when opened from calendar (single or multiple dates)
  useEffect(() => {
    if (open && lockedDates) {
      setMode("individual");
      setDates(lockedDates);
    }
  }, [open, initialDate, initialDates]); // lockedDates derived from these

  const generateDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const results: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      results.push(new Date(d).toISOString().slice(0, 10));
    }
    return results;
  };

  const selectedCount = useMemo(() => {
    if (lockedDates) return lockedDates.length;

    if (mode === "range" && rangeFrom && rangeTo) {
      const start = new Date(rangeFrom);
      const end = new Date(rangeTo);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
      return (
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1
      );
    } else if (mode === "individual") {
      return dates.filter(Boolean).length;
    }
    return 0;
  }, [mode, rangeFrom, rangeTo, dates, lockedDates]);

  /* ---------------- STEP 1: PICK DATES ---------------- */

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    // If coming from calendar selection → dates are fixed
    if (lockedDates) {
      setFinalDates(lockedDates);
      setStep("confirm");
      return;
    }

    let parsed: string[] = [];

    if (mode === "range") {
      if (!rangeFrom || !rangeTo) {
        alert("Selecteer een geldige periode.");
        return;
      }
      parsed = generateDateRange(rangeFrom, rangeTo);
    } else {
      parsed = dates.filter(Boolean);
      if (parsed.length === 0) {
        alert("Voeg minstens één datum toe.");
        return;
      }
    }

    setFinalDates(parsed);
    setStep("confirm");
  };

  /* ---------------- STEP 2: MERGE & SAVE ---------------- */

  const handleConfirm = async () => {
    const newStart = toMinutes(timeFrom);
    const newEnd = toMinutes(timeUntil);

    if (newEnd <= newStart) {
      alert("De eindtijd moet later zijn dan de starttijd.");
      return;
    }

    try {
      for (const d of finalDates) {
        // 1) Fetch existing blocks for that day
        const { data: existing, error: fetchError } = await supabase
          .from("blocked_hours")
          .select("id, time_from, time_until, notes, repeat_type")
          .eq("blocked_date", d);

        if (fetchError) {
          console.error("❌ Fout bij ophalen bestaande blokken:", fetchError);
          alert("Fout bij ophalen bestaande blokken.");
          return;
        }

        const intervals: Interval[] =
          existing?.map((b: any) => ({
            start: toMinutes(b.time_from.slice(0, 5)),
            end: toMinutes(b.time_until.slice(0, 5)),
            notes: b.notes ?? null,
            repeat_type: b.repeat_type ?? "none",
          })) ?? [];

        // 2) Add the new interval from this modal
        intervals.push({
          start: newStart,
          end: newEnd,
          notes: notes || null,
          repeat_type: repeatType,
        });

        // 3) Merge overlaps for that day
        const merged = mergeIntervals(intervals);

        // 4) Delete old rows for that day
        if (existing && existing.length > 0) {
          const ids = existing.map((b: any) => b.id);
          const { error: deleteError } = await supabase
            .from("blocked_hours")
            .delete()
            .in("id", ids);

          if (deleteError) {
            console.error("❌ Fout bij verwijderen oude blokken:", deleteError);
            alert("Fout bij opslaan geblokkeerde uren (verwijderen mislukte).");
            return;
          }
        }

        // 5) Insert merged rows
        const inserts = merged.map((int) => ({
          blocked_date: d,
          time_from: fromMinutes(int.start) + ":00",
          time_until: fromMinutes(int.end) + ":00",
          notes: int.notes,
          repeat_type: int.repeat_type,
        }));

        const { error: insertError } = await supabase
          .from("blocked_hours")
          .insert(inserts);

        if (insertError) {
          console.error("❌ Fout bij invoegen geblokkeerde uren:", insertError);
          alert("Fout bij opslaan geblokkeerde uren.");
          return;
        }
      }

      setStep("success");
      setTimeout(() => {
        onSaved?.();
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      console.error("❌ Onverwachte fout bij opslaan geblokkeerde uren:", err);
      alert("Onverwachte fout bij opslaan geblokkeerde uren.");
    }
  };

  /* ---------------- RESET ---------------- */

  const resetForm = () => {
    setMode("range");
    setDates([""]);
    setRangeFrom("");
    setRangeTo("");
    setTimeFrom("09:00");
    setTimeUntil("17:00");
    setNotes("");
    setRepeatType("none");
    setFinalDates([]);
    setStep("form");
  };

  if (!open) return null;

  /* ---------------- UI CONSTANTS ---------------- */

  const input = {
    width: "100%",
    padding: "8px",
    borderRadius: 10,
    border: "1px solid var(--vv-border)",
    fontFamily: "var(--font-main)",
    fontSize: "0.95rem",
  } as const;

  const button = {
    padding: "8px 16px",
    borderRadius: 10,
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s",
  } as const;

  const btnRow = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "14px",
  } as const;

  /* ---------------- RENDER ---------------- */

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(90vw,420px)",
          background: "#fff",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          fontFamily: "var(--font-main)",
        }}
      >
        {/* ================== STEP: FORM ================== */}
        {step === "form" && (
          <>
            <h3
              style={{
                color: "var(--vv-primary)",
                margin: "0 0 10px",
                fontFamily: "var(--font-title)",
                textAlign: "center",
              }}
            >
              Blokkeer Uren
            </h3>

            <form
              onSubmit={handleNext}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* TYPE SELECTIE — alleen tonen als er geen lockedDates zijn */}
              {!lockedDates && (
                <>
                  <label style={{ fontWeight: 500 }}>Type selectie</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <input
                        type="radio"
                        value="range"
                        checked={mode === "range"}
                        onChange={() => setMode("range")}
                      />
                      Periode
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <input
                        type="radio"
                        value="individual"
                        checked={mode === "individual"}
                        onChange={() => setMode("individual")}
                      />
                      Individuele datums
                    </label>
                  </div>
                </>
              )}

              {/* INFO wanneer locked vanuit kalender (single of multi) */}
              {lockedDates && (
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "#fdf2f7",
                    border: "1px solid var(--vv-border)",
                    fontSize: "0.9rem",
                  }}
                >
                  Voor geselecteerde datums:
                  <br />
                  {lockedDates
                    .slice()
                    .sort()
                    .map((d) =>
                      new Date(d).toLocaleDateString("nl-BE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    )
                    .join(", ")}
                </div>
              )}

              {/* RANGE MODE (geen lockedDates) */}
              {mode === "range" && !lockedDates && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label>Van</label>
                      <input
                        type="date"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                        required
                        style={input}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Tot</label>
                      <input
                        type="date"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                        required
                        style={input}
                      />
                    </div>
                  </div>

                  {selectedCount > 0 && (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--vv-primary)",
                        marginTop: "2px",
                      }}
                    >
                      🗓️ {selectedCount}{" "}
                      {selectedCount === 1 ? "dag" : "dagen"} geselecteerd
                    </p>
                  )}
                </div>
              )}

              {/* INDIVIDUAL MODE (alleen vrij als geen lockedDates) */}
              {mode === "individual" && !lockedDates && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {dates.map((d, idx) => (
                    <div
                      key={idx}
                      style={{ display: "flex", gap: "6px", alignItems: "center" }}
                    >
                      <input
                        type="date"
                        value={d}
                        onChange={(e) => {
                          const updated = [...dates];
                          updated[idx] = e.target.value;
                          setDates(updated);
                        }}
                        required={idx === 0}
                        style={input}
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDates(dates.filter((_, i) => i !== idx))
                          }
                          style={{
                            ...button,
                            padding: "4px 8px",
                            background: "#f5f5f5",
                            border: "1px solid #ddd",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setDates([...dates, ""])}
                    style={{
                      ...button,
                      background: "#fafafa",
                      color: "var(--vv-primary)",
                      border: "1px solid var(--vv-primary)",
                      marginTop: "4px",
                    }}
                  >
                    + Voeg nog een datum toe
                  </button>
                </div>
              )}

              <label style={{ fontWeight: 500 }}>Tijdspanne</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  required
                  style={{ ...input, flex: 1 }}
                />
                <input
                  type="time"
                  value={timeUntil}
                  onChange={(e) => setTimeUntil(e.target.value)}
                  required
                  style={{ ...input, flex: 1 }}
                />
              </div>

              <label style={{ fontWeight: 500 }}>Herhaling</label>
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                style={input}
              >
                <option value="none">Geen</option>
                <option value="weekly">Wekelijks</option>
                <option value="monthly">Maandelijks</option>
                <option value="yearly">Jaarlijks</option>
              </select>

              <label style={{ fontWeight: 500 }}>Notitie (optioneel)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="vb. Privéafspraak, verlof, ..."
                style={input}
              />

              <div style={btnRow}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    ...button,
                    background: "#fafafa",
                    color: "#555",
                    border: "1px solid #ddd",
                  }}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  style={{
                    ...button,
                    background:
                      "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  Volgende
                </button>
              </div>
            </form>
          </>
        )}

        {/* ================== STEP: CONFIRM ================== */}
        {step === "confirm" && (
          <div style={{ textAlign: "center" }}>
            <h3
              style={{ color: "var(--vv-primary)", marginBottom: "14px" }}
            >
              Bevestig Geblokkeerde Uren
            </h3>
            <p>
              <strong>Datums:</strong>{" "}
              {finalDates
                .slice()
                .sort()
                .map((d) =>
                  new Date(d).toLocaleDateString("nl-BE", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                )
                .join(", ")}
            </p>
            <p>
              <strong>Van:</strong> {timeFrom} – <strong>Tot:</strong>{" "}
              {timeUntil}
            </p>
            {repeatType !== "none" && <p>🔁 Herhaling: {repeatType}</p>}
            {notes && (
              <p>
                <strong>Notitie:</strong> {notes}
              </p>
            )}
            <div style={btnRow}>
              <button
                onClick={() => setStep("form")}
                style={{
                  ...button,
                  background: "#fafafa",
                  color: "#555",
                  border: "1px solid #ddd",
                }}
              >
                Terug
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  ...button,
                  background:
                    "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                  color: "#fff",
                  border: "none",
                }}
              >
                Bevestigen
              </button>
            </div>
          </div>
        )}

        {/* ================== STEP: SUCCESS ================== */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h3 style={{ color: "var(--vv-primary)" }}>🕓 Uren geblokkeerd!</h3>
          </div>
        )}
      </div>
    </div>
  );
}
