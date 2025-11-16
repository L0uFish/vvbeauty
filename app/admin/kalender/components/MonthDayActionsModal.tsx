"use client";

export default function MonthDayActionsModal({
  open,
  onClose,
  date,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  onPick: (action: "add" | "hours" | "block") => void;
}) {
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
        zIndex: 90,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{
          width: "min(90vw,320px)",
          background: "#fff",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: 0, color: "var(--vv-primary)" }}>
          {new Date(date).toLocaleDateString("nl-BE")}
        </h3>

        <button style={btn} onClick={() => onPick("add")}>
          📅 Afspraak toevoegen
        </button>

        <button style={btn} onClick={() => onPick("hours")}>
          🕒 Openingsuren wijzigen
        </button>

        <button style={btn} onClick={() => onPick("block")}>
          ⛔ Uren blokkeren
        </button>

        <button
          onClick={onClose}
          style={{
            ...btn,
            background: "#eee",
            color: "#333",
          }}
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
  color: "#fff",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  fontSize: "0.95rem",
};
