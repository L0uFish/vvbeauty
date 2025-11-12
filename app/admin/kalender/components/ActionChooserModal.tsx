"use client";
import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (action: "add-appointment" | "custom-hours" | "block-hours") => void;
};

export default function ActionChooserModal({ open, onClose, onPick }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
        display: "grid", placeItems: "center", zIndex: 50
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 420px)",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid var(--vv-border)",
          boxShadow: "var(--vv-shadow)",
          padding: 16
        }}
      >
        <h3 style={{ margin: "0 0 10px", color: "var(--vv-primary)" }}>Kies een actie</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <button className="tab on" onClick={() => onPick("add-appointment")}>
            Afspraak toevoegen
          </button>
          <button className="tab" onClick={() => onPick("custom-hours")}>
            Aangepaste openingsuren
          </button>
          <button className="tab" onClick={() => onPick("block-hours")}>
            Blokkeer uren
          </button>
        </div>

        <div style={{ marginTop: 10, textAlign: "right" }}>
          <button className="tab" onClick={onClose}>Annuleer</button>
        </div>
      </div>
    </div>
  );
}
