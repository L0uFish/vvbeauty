"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, PropsWithChildren } from "react";
import "@/app/admin/styles/admin.css";

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname?.startsWith(href);
  return (
    <Link
      href={href}
      className={`navlink ${active ? "active" : ""}`}
    >
      {label}
    </Link>
  );
};

export default function AdminLayout({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation (for mobile)
  const handleNavClick = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      {/* Toggle button (mobile) */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((s) => !s)}
      >
        ☰ Menu
      </button>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <h2>VVBeauty Admin</h2>
        <nav onClick={handleNavClick}>
          <NavLink href="/admin/kalender" label="📅 Kalender" />
          <NavLink href="/admin/klanten" label="👥 Klanten" />
          <NavLink href="/admin/diensten" label="🛠️ Diensten" />
        </nav>
        <hr />
        <Link href="/" onClick={handleNavClick}>
          ← Terug naar Website
        </Link>
      </aside>

      {/* Main content */}
      <main className="admin-main">{children}</main>
    </div>
  );
}
