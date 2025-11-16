"use client";
import React from "react";
import { View } from "@/app/types/scheduling";

type Props = {
  view: View;
  onChangeView: (v: View) => void;
  title: string;
  showCancelled: boolean;
  onToggleCancelled: (v: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
  onOpenActionChooser: () => void;
};

export default function AdminCalendarLayout({
  view,
  onChangeView,
  title,
  showCancelled,
  onToggleCancelled,
  onPrev,
  onNext,
  children,
  onOpenActionChooser,
}: Props) {
  return (
    <div className="k-wrap">
      {/* === TOP TOOLBAR === */}
      <div className="k-toolbar">
        <div className="k-filters">
          {(["day", "month", "year", "list"] as View[]).map((v) => (
            <button
              key={v}
              className={`tab ${view === v ? "on" : ""}`}
              onClick={() => onChangeView(v)}
            >
              {v === "day"
                ? "Dag"
                : v === "month"
                ? "Maand"
                : v === "year"
                ? "Jaar"
                : "Lijst"}
            </button>
          ))}

          <label className="k-check">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => onToggleCancelled(e.target.checked)}
            />
            Geannuleerden tonen
          </label>
        </div>

        <button
          aria-label="Nieuwe actie"
          onClick={onOpenActionChooser}
          style={{
            borderRadius: 10,
            padding: "8px 12px",
            border: "1px solid var(--vv-border)",
            background:
              "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          + Actie
        </button>
      </div>

      {/* === DATE NAVIGATION (HIDDEN IN LIST VIEW) === */}
      {view !== "list" && (
        <div className="k-range">
          <button onClick={onPrev}>◀</button>
          <h3>{title}</h3>
          <button onClick={onNext}>▶</button>
        </div>
      )}

      {/* === MAIN CONTENT === */}
      <div className="k-stage">{children}</div>
    </div>
  );
}
