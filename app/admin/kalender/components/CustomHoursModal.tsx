"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState, useMemo } from "react";

export default function CustomHoursModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
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

  const handleAddDate = () => setDates([...dates, ""]);

  const handleDateChange = (i: number, value: string) => {
    const updated = [...dates];
    updated[i] = value;
    setDates(updated);
  };

  const generateDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const results: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      results.push(new Date(d).toISOString().slice(0, 10));
    }
    return results;
  };

  // 🧮 Calculate number of selected days dynamically
  const selectedCount = useMemo(() => {
    if (mode === "range" && rangeFrom && rangeTo) {
      const start = new Date(rangeFrom);
      const end = new Date(rangeTo);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else if (mode === "individual") {
      return dates.filter(Boolean).length;
    }
    return 0;
  }, [mode, rangeFrom, rangeTo, dates]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleConfirm = async () => {
    const inserts = finalDates.map((d) => {
      const dateObj = new Date(d);
      return {
        type: "day",
        date: d,
        week_start: null,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        open_time: isClosed ? null : openTime + ":00",
        close_time: isClosed ? null : closeTime + ":00",
        is_closed: isClosed,
        notes,
      };
    });

    const { error } = await supabase.from("custom_hours").insert(inserts);

    if (error) {
      console.error("❌ Fout bij opslaan aangepaste uren:", error);
      alert("Fout bij opslaan aangepaste uren");
    } else {
      setStep("success");
      setTimeout(() => {
        onSaved?.();
        onClose();
        resetForm();
      }, 1500);
    }
  };

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

            <form onSubmit={handleNext} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontWeight: 500 }}>Type selectie</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    value="range"
                    checked={mode === "range"}
                    onChange={() => setMode("range")}
                  />
                  Periode
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    value="individual"
                    checked={mode === "individual"}
                    onChange={() => setMode("individual")}
                  />
                  Individuele datums
                </label>
              </div>

              {mode === "range" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                    <p style={{ fontSize: "0.9rem", color: "var(--vv-primary)", marginTop: "2px" }}>
                      🗓️ {selectedCount} {selectedCount === 1 ? "dag" : "dagen"} geselecteerd
                    </p>
                  )}
                </div>
              )}

              {mode === "individual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {dates.map((d, i) => (
                    <input
                      key={i}
                      type="date"
                      value={d}
                      onChange={(e) => handleDateChange(i, e.target.value)}
                      required={i === 0}
                      style={input}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddDate}
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

                  {selectedCount > 0 && (
                    <p style={{ fontSize: "0.9rem", color: "var(--vv-primary)", marginTop: "2px" }}>
                      🗓️ {selectedCount} {selectedCount === 1 ? "dag" : "dagen"} geselecteerd
                    </p>
                  )}
                </div>
              )}

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

              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  style={{ ...button, background: "#fafafa", color: "#555", border: "1px solid #ddd" }}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  style={{
                    ...button,
                    background: "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
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

        {step === "confirm" && (
          <div style={{ textAlign: "center" }}>
            <h3 style={{ color: "var(--vv-primary)", marginBottom: "14px" }}>
              Bevestig Aangepaste Uren
            </h3>
            <p>
              <strong>Datums:</strong>{" "}
              {finalDates.map((d) => new Date(d).toLocaleDateString("nl-BE")).join(", ")}
            </p>
            {isClosed ? (
              <p><strong>Gesloten</strong></p>
            ) : (
              <p><strong>Open:</strong> {openTime} – {closeTime}</p>
            )}
            {notes && <p><strong>Notitie:</strong> {notes}</p>}

            <div style={btnRow}>
              <button
                onClick={() => setStep("form")}
                style={{ ...button, background: "#fafafa", color: "#555", border: "1px solid #ddd" }}
              >
                Terug
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  ...button,
                  background: "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                  color: "#fff",
                  border: "none",
                }}
              >
                Bevestigen
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h3 style={{ color: "var(--vv-primary)" }}>💅 Uren opgeslagen!</h3>
          </div>
        )}
      </div>
    </div>
  );
}

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
