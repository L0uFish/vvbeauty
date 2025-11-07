"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import "../../styles/AdminSidebar.css";

export type AdminTab =
  | "gebruikers"
  | "agenda"
  | "openingstijden"
  | "diensten"
  | "month"
  | "day";


interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const tabs = [
  { key: "gebruikers", label: "Gebruikers", icon: "👥" },
  { key: "agenda", label: "Afspraken", icon: "📝" },
  { key: "diensten", label: "Diensten", icon: "🛠️" },
  { key: "openingstijden", label: "Jaar", icon: "📅" },
  { key: "month", label: "Maand", icon: "🗓️" },
  { key: "day", label: "Dag", icon: "📆" },
] as const;

export default function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 🔒 Prevent body scroll when menu is open
  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
  }, [isOpen]);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleSelect = (tabKey: AdminTab) => {
    setActiveTab(tabKey);
    setIsOpen(false);
  };

  return (
    <>
      {/* === Mobile Menu Button === */}
      <button className="mobile-menu-btn" onClick={handleToggle}>
        {isOpen ? "✖" : "☰"}
      </button>

      {/* === Sidebar === */}
      <nav className={`admin-sidebar ${isOpen ? "open" : ""}`}>
        <h2 className="sidebar-header">Admin</h2>
        <div className="sidebar-menu">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleSelect(tab.key)}
              className={`sidebar-button ${activeTab === tab.key ? "active" : ""}`}
            >
              <span className="sidebar-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <Link href="/" className="back-to-site" onClick={() => setIsOpen(false)}>
            ← Terug naar Website
          </Link>
        </div>
      </nav>

      {/* === Mobile Overlay (click to close) === */}
      {isOpen && <div className="mobile-overlay show" onClick={() => setIsOpen(false)} />}
    </>
  );
}
