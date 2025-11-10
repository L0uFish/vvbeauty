"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/modals/Modals.css";

export default function BlockedHourModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [blockedDate, setBlockedDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeUntil, setTimeUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  

  const handleSave = async () => {
    if (!blockedDate || !timeFrom || !timeUntil) {
      setError("Gelieve datum, begin- en einduur in te vullen.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("blocked_hours").insert([
      {
        blocked_date: blockedDate,
        time_from: timeFrom,
        time_until: timeUntil,
        notes: notes || null,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("Error inserting blocked hour:", error);
      setError("Er is iets misgegaan bij het opslaan.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onSaved();
    }, 1200);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Geblokkeerde Uren Toevoegen</h3>

        <label>Datum</label>
        <input
          type="date"
          value={blockedDate}
          onChange={(e) => setBlockedDate(e.target.value)}
        />

        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label>Van</label>
            <input
              type="time"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Tot</label>
            <input
              type="time"
              value={timeUntil}
              onChange={(e) => setTimeUntil(e.target.value)}
            />
          </div>
        </div>

        <label>Opmerking (optioneel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="bv. Puppycursus"
        />

        {error && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>
        )}
        {success && (
          <p style={{ color: "green", marginTop: "0.5rem" }}>
            ✅ Succesvol opgeslagen!
          </p>
        )}

        <div className="modal-actions">
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ backgroundColor: "#b23561", color: "white" }}
          >
            {loading ? "Opslaan..." : "Opslaan"}
          </button>
          <button onClick={onClose} disabled={loading}>
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
