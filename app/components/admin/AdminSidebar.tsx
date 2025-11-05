// components/admin/AdminSidebar.tsx
"use client";

import React from 'react';
import Link from 'next/link'; // Use Link for navigation outside of the current component's state change
import '../../styles/AdminSidebar.css'; // Import the dedicated CSS file

// Define the possible tabs (matching the keys in page.tsx)
export type AdminTab = "gebruikers" | "agenda" | "openingstijden" | "diensten";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const tabs: { key: AdminTab; label: string; icon: string }[] = [
  { key: "gebruikers", label: "Gebruikers", icon: "👥" },
  { key: "agenda", label: "Agenda", icon: "📅" },
  { key: "openingstijden", label: "Openingstijden", icon: "⏰" },
  { key: "diensten", label: "Diensten", icon: "🛠️" },
];

export default function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  return (
    <nav className="admin-sidebar">
      <h2 className="sidebar-header">Admin</h2>
      <div className="sidebar-menu">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`sidebar-button ${activeTab === tab.key ? "active" : ""}`}
          >
            <span className="sidebar-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Optional: Add a link back to the main site for easy switching */}
      <div className="sidebar-footer">
        <Link href="/" className="back-to-site">
            ← Terug naar Website
        </Link>
      </div>
    </nav>
  );
}