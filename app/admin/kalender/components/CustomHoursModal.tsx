"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState, useMemo, useEffect } from "react";

export default function CustomHoursModal({
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
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [isClosed, setIsClosed] = useState(false);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [finalDates, setFinalDates] = useState<string[]>([]);

  const hasMultiDates = !!(initialDates && initialDates.length > 0);
  const isLockedSelection = !!initialDate || hasMultiDates;

  /* ------------------------------------------------------------------ */
  /*  PREFILL when opening from DayView or MonthView                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return;

    // Multi-day selection from MonthView
    if (hasMultiDates) {
      setMode("individual");
      setDates(initialDates!);
      return;
    }

    // Single-day edit from DayView / MonthView
    if (initialDate) {
      setMode("individual");
      setDates([initialDate]);
      return;
    }

    // Fresh open (top action) → default
    setMode("range");
    setDates([""]);
  }, [open, initialDate, hasMultiDates, initialDates]);

  /* ------------------------------------------------------------------ */
  /*  STYLES                                                            */
  /* ------------------------------------------------------------------ */

  const input: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    borderRadius: 10,
    border: "1px solid var(--vv-border)",
    fontFamily: "var(--font-main)",
    fontSize: "0.95rem",
  };

  const button: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 10,
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s",
  };

  const btnRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "14px",
  };

  /* ------------------------------------------------------------------ */
  /*  HELPERS                                                           */
  /* ------------------------------------------------------------------ */

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
    // If coming from MonthView multi-selection → just count those
    if (hasMultiDates) return initialDates!.length;

    if (mode === "range" && rangeFrom && rangeTo) {
      const start = new Date(rangeFrom);
      const end = new Date(rangeTo);
      if (start > end) return 0;

      return (
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1
      );
    }

    if (mode === "individual") return dates.filter(Boolean).length;

    return 0;
  }, [hasMultiDates, initialDates, mode, rangeFrom, rangeTo, dates]);

  /* ------------------------------------------------------------------ */
  /*  STEP 1: Build list of finalDates                                  */
  /* ------------------------------------------------------------------ */

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    let parsed: string[];

    // ✅ Multi-day selection from MonthView → use those dates as-is
    if (hasMultiDates) {
      parsed = [...(initialDates as string[])];
    } else if (mode === "range") {
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

  /* ------------------------------------------------------------------ */
  /*  STEP 2: DELETE OLD ROWS + INSERT NEW                              */
  /* ------------------------------------------------------------------ */

  const handleConfirm = async () => {
    // 1) DELETE any old custom hours for these dates
    const { error: deleteError } = await supabase
      .from("custom_hours")
      .delete()
      .eq("type", "day")
      .in("date", finalDates);

    if (deleteError) {
      console.error("❌ Delete error:", deleteError);
      alert("Fout bij verwijderen oude aangepaste uren.");
      return;
    }

    // 2) Insert new rows
    const inserts = finalDates.map((d) => {
      const dObj = new Date(d);
      return {
        type: "day",
        date: d,
        week_start: null,
        month: dObj.getMonth() + 1,
        year: dObj.getFullYear(),
        open_time: isClosed ? null : openTime + ":00",
        close_time: isClosed ? null : closeTime + ":00",
        is_closed: isClosed,
        notes: notes || null,
      };
    });

    const { error: insertError } = await supabase
      .from("custom_hours")
      .insert(inserts);

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      alert("Fout bij opslaan aangepaste uren.");
      return;
    }

    // 3) Success
    setStep("success");

    setTimeout(() => {
      onSaved?.();
      onClose();
      resetForm();
    }, 1500);
  };

  /* ------------------------------------------------------------------ */
  /*  RESET                                                             */
  /* ------------------------------------------------------------------ */

  const resetForm = () => {
    setMode("range");
    setDates([""]);
    setRangeFrom("");
    setRangeTo("");
    setOpenTime("09:00");
    setCloseTime("17:00");
    setIsClosed(false);
    setNotes("");
    setFinalDates([]);
    setStep("form");
  };

  if (!open) return null;

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                            */
  /* ------------------------------------------------------------------ */

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
        {/* ---------------------------------------------------------- */}
        {/* FORM STEP                                                  */}
        {/* ---------------------------------------------------------- */}
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
              Aangepaste Openingsuren
            </h3>

            <form
              onSubmit={handleNext}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {/* TYPE SELECTIE — hidden if coming from initialDate/initialDates */}
              {!isLockedSelection && (
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

              {/* RANGE MODE — only visible in free mode */}
              {mode === "range" && !isLockedSelection && (
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

              {/* INDIVIDUAL MODE */}
              {mode === "individual" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {isLockedSelection ? (
                    // 🔒 Locked dates (from calendar)
                    <>
                      {dates.map((d, idx) => (
                        <input
                          key={idx}
                          type="date"
                          value={d}
                          disabled
                          style={{ ...input, opacity: 0.7 }}
                        />
                      ))}
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#777",
                          marginTop: "4px",
                        }}
                      >
                        Deze datums zijn geselecteerd in de kalender.
                      </p>
                    </>
                  ) : (
                    // Free manual entry
                    <>
                      {dates.map((d, idx) => (
                        <input
                          key={idx}
                          type="date"
                          value={d}
                          onChange={(e) => {
                            const next = [...dates];
                            next[idx] = e.target.value;
                            setDates(next);
                          }}
                          required={idx === 0}
                          style={input}
                        />
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
                    </>
                  )}
                </div>
              )}

              {/* HOURS */}
              <label style={{ fontWeight: 500 }}>Openingsuren</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  disabled={isClosed}
                  style={{ ...input, flex: 1 }}
                />
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  disabled={isClosed}
                  style={{ ...input, flex: 1 }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                />
                Gesloten
              </label>

              <label style={{ fontWeight: 500 }}>Notitie (optioneel)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="vb. Feestdag, opleiding, ..."
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

        {/* ---------------------------------------------------------- */}
        {/* CONFIRM STEP                                               */}
        {/* ---------------------------------------------------------- */}
        {step === "confirm" && (
          <div style={{ textAlign: "center" }}>
            <h3 style={{ color: "var(--vv-primary)", marginBottom: "14px" }}>
              Bevestig Aangepaste Uren
            </h3>

            <p>
              <strong>Datums:</strong>{" "}
              {finalDates
                .map((d) => new Date(d).toLocaleDateString("nl-BE"))
                .join(", ")}
            </p>

            {isClosed ? (
              <p>
                <strong>Gesloten</strong>
              </p>
            ) : (
              <p>
                <strong>Open:</strong> {openTime} – {closeTime}
              </p>
            )}

            {notes && (
              <p>
                <strong>Notitie:</strong> {notes}</p>
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

        {/* ---------------------------------------------------------- */}
        {/* SUCCESS STEP                                               */}
        {/* ---------------------------------------------------------- */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h3 style={{ color: "var(--vv-primary)" }}>
              💅 Uren opgeslagen!
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
