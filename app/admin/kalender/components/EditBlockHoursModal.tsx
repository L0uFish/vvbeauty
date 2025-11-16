"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EditBlockHoursModal({
  open,
  onClose,
  block,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  block: any;
  onUpdated?: () => void;
}) {
  if (!open || !block) return null;

  const [from, setFrom] = useState(block.time_from.slice(0,5));
  const [until, setUntil] = useState(block.time_until.slice(0,5));
  const [notes, setNotes] = useState(block.notes ?? "");

  const handleSave = async () => {
    await supabase
      .from("blocked_hours")
      .update({
        time_from: from + ":00",
        time_until: until + ":00",
        notes: notes || null,
      })
      .eq("id", block.id);

    onUpdated?.();
    onClose();
  };

  const handleDelete = async () => {
    await supabase
      .from("blocked_hours")
      .delete()
      .eq("id", block.id);

    onUpdated?.();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Blokkering aanpassen</h2>

        <label>
          Van:
          <input
            type="time"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label>
          Tot:
          <input
            type="time"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>

        <label>
          Notities:
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button className="delete-btn" onClick={handleDelete}>
            Verwijderen
          </button>

          <button className="save-btn" onClick={handleSave}>
            Opslaan
          </button>

          <button className="close-btn" onClick={onClose}>
            Sluiten
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-card {
          background: white;
          padding: 24px;
          width: 90%;
          max-width: 420px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        input, textarea {
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #ccc;
        }
        .modal-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
        }
        .delete-btn {
          background: #e57373;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
        }
        .save-btn {
          background: #66bb6a;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
        }
        .close-btn {
          background: #aaa;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
        }
      `}</style>
    </div>
  );
}
