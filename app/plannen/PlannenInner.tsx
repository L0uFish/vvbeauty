"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Calendar from "./Calendar";
import Timeslots from "./Timeslots";
import { useUser } from "@/app/context/UserContext";
import { useAuthUI } from "@/app/context/AuthUIContext";
import { useRequirePhone } from "@/app/hooks/useRequirePhone";
import "./plannen.css";

export default function PlannenInner({ initialService }: { initialService: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { openLogin } = useAuthUI();
  const { ensurePhone, MiniPhoneModal } = useRequirePhone();

  const [showSuccess, setShowSuccess] = useState(false);
  const [service, setService] = useState<any>(initialService);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const serviceId = searchParams?.get("service");

  // ✅ Restore preselected date/time if redirected after login
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const preDate = params.get("date");
    const preTime = params.get("time");
    if (preDate) setSelectedDate(preDate);
    if (preTime) setSelectedTime(preTime);
  }, []);

  // ✅ Only re-fetch if user navigates to a different service
  useEffect(() => {
    if (!serviceId || serviceId === initialService?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .single();

      if (!error && data) setService(data);
    })();
  }, [serviceId, initialService]);

  // ============================================
  // 🟩 HANDLE BOOKING CLICK
  // ============================================
  const handleBooking = async () => {
    console.log("🟢 handleBooking clicked", { user, selectedDate, selectedTime, service });

    if (!selectedDate || !selectedTime || !service) {
      console.warn("⛔ Missing date/time/service");
      return;
    }

    // ✅ Not logged in → store pending booking
    if (!user) {
      localStorage.setItem(
        "pendingBooking",
        JSON.stringify({
          serviceId: service.id,
          selectedDate,
          selectedTime,
        })
      );
      console.warn("🔒 No user, opening login...");
      openLogin();
      return;
    }

    // ✅ Ensure phone is filled in
    console.log("📞 Ensuring phone...");
    const hasPhone = await ensurePhone();
    console.log("📞 ensurePhone() result:", hasPhone);
    if (!hasPhone) {
      console.warn("⛔ No phone → aborting booking");
      return;
    }

    console.log("✅ Phone verified, creating booking...");
    await createBooking();
  };

  // ============================================
  // 🟦 CREATE BOOKING IN SUPABASE
  // ============================================
  const createBooking = async () => {
    console.log("➡️ createBooking started");

    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("appointments")
        .insert([
          {
            service_id: service.id,
            user_id: user.id,
            date: selectedDate,
            time: selectedTime,
            status: "pending",
          },
        ])
        .select();

      console.log("📦 Supabase insert result:", { data, error });

      if (error) {
        alert("❌ Er is iets misgegaan bij het boeken. Probeer opnieuw.");
        return;
      }

      // ✅ Booking success: show popup
      setShowSuccess(true);
      console.log("✅ Appointment created successfully!");

      // Wait before redirecting
      setTimeout(() => {
        router.push("/");
      }, 3000);

      // Hide popup a bit later (after redirect)
      setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
    } catch (err) {
      console.error("🔥 Exception during booking:", err);
      alert("❌ Er ging iets mis. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // 🧱 UI RENDER
  // ============================================
  if (!service) {
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <h2 className="plannen-title">Dienst niet gevonden</h2>
        </div>
      </main>
    );
  }

  return (
    <main className="plannen-container">
      <div className="plannen-card">
        <h1 className="plannen-title">{service.name}</h1>
        <p className="plannen-description">{service.description}</p>

        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        {selectedDate && (
          <Timeslots selectedTime={selectedTime} onSelectTime={setSelectedTime} />
        )}

        <button
          type="button"
          disabled={!selectedDate || !selectedTime || saving}
          className={`plannen-button ${selectedDate && selectedTime ? "active" : ""}`}
          onClick={handleBooking}
        >
          {saving ? "Bezig..." : "Bevestig afspraak"}
        </button>

        {message && <p className="confirmation-message">{message}</p>}
      </div>

      {MiniPhoneModal}

      {showSuccess && (
        <div className="modal-overlay mini-blocker">
          <div className="mini-modal-content">
            <h3>✅ Afspraak bevestigd!</h3>
            <p>Bedankt voor je boeking — we zien je binnenkort!</p>
          </div>
        </div>
      )}
    </main>
  );
}
