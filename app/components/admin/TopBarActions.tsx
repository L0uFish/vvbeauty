"use client";

import { useState } from "react";
import AddMenuModal from "./AddMenuModal";
import "../../styles/TopBarActions.css";

export default function TopBarActions() {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="topbar-actions">
      <button className="btn" onClick={() => alert("Open Opening Hours modal")}>
        📅 Opening Hours
      </button>
      <button className="btn add-btn" onClick={() => setShowAddMenu(true)}>
        ＋
      </button>

      {showAddMenu && (
        <AddMenuModal onClose={() => setShowAddMenu(false)} />
      )}
    </div>
  );
}
