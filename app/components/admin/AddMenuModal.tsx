"use client";

import { createPortal } from "react-dom";
import "../../styles/modals/AddMenuModal.css";

export default function AddMenuModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className="addmenu-overlay" onClick={onClose}>
      <div className="addmenu-box" onClick={(e) => e.stopPropagation()}>
        <h3>Nieuw toevoegen</h3>
        <button onClick={() => alert("Add Customer")}>👤 Klant</button>
        <button onClick={() => alert("Add Time Block")}>⏱️ Tijdblok</button>
        <button onClick={() => alert("Add Appointment")}>💅 Afspraak</button>
      </div>
    </div>,
    document.body
  );
}
