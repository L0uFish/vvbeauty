"use client";

import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AdminSidebar, { AdminTab } from "../components/admin/AdminSidebar";
import UsersManager from "../components/admin/UsersManager";
import AgendaManager from "../components/admin/AgendaManager";
import OpeningHoursManager from "../components/admin/AvailabilityManager";
import MonthView from "@/app/components/admin/MonthView";
import DayView from "@/app/components/admin/DayView";
import ServicesManager from "../components/admin/ServicesManager";
import "../styles/AdminPage.css";

const ComponentMap: Record<AdminTab, React.FC> = {
  gebruikers: UsersManager,
  agenda: AgendaManager,
  openingstijden: OpeningHoursManager,
  diensten: ServicesManager,
  month: MonthView,
  day: DayView,
};

// ... rest of your component stays unchanged


export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("gebruikers");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // --- Auth and Role Check ---
  useEffect(() => {
    async function checkAuthAndRole() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Redirect if not logged in
        router.push("/");
        return;
      }

      // Fetch user role from the 'clients' table (as established in LoginBtn)
      const { data: profile, error } = await supabase
        .from("clients")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error || profile?.role !== "admin") {
        // Redirect if not an admin
        router.push("/");
        return;
      }

      setUserRole(profile.role);
      setLoading(false);
    }

    checkAuthAndRole();
    
    // Cleanup function is not strictly needed here but good practice
    return () => {};
  }, [router]);

  // Use useMemo to prevent unnecessary re-renders of the content component
  const ActiveComponent = useMemo(() => ComponentMap[activeTab], [activeTab]);

  if (loading || userRole !== "admin") {
    // Show a minimal loading state while checking the role
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Laden...</p> {/* You might want a better spinner here */}
      </div>
    );
  }

  return (
    <div className="admin-page-layout">
      {/* 1. Sidebar for navigation */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main content area */}
      <main className="main-content">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Admin Panel: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h1>
        <div className="bg-white p-6 rounded-lg shadow">
          {/* Render the active component */}
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
