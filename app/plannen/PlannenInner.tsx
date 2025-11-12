// app/plannen/PlannenInner.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Calendar from "./Calendar";
import Timeslots from "./Timeslots";
import { useUser } from "@/app/context/UserContext";
import { useAuthUI } from "@/app/context/AuthUIContext";
import { useRequirePhone } from "@/app/hooks/useRequirePhone";
import "../styles/plannen.css";

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
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);

  const serviceId = searchParams?.get("service");

  // Pre-fill from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const preDate = params.get("date");
    const preTime = params.get("time");
    if (preDate) setSelectedDate(preDate);
    if (preTime) setSelectedTime(preTime);
  }, []);

  // Re-fetch service + hours if serviceId changes
  useEffect(() => {
    if (!serviceId || serviceId === initialService?.id) return;

    (async () => {
      try {
        // 1. Load service (no relations)
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name, description, duration_minutes, buffer_minutes")
          .eq("id", serviceId)
          .single();

        if (serviceError || !serviceData) {
          console.error("Service not found:", serviceError);
          return;
        }

        // 2. Load ALL general_hours (global)
        const { data: generalHours } = await supabase
          .from("general_hours")
          .select("*");

        // 3. Load custom_hours for current month
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const { data: customHours } = await supabase
          .from("custom_hours")
          .select("date, open_time, close_time, is_closed")
          .gte("date", `${year}-${month}-01`)
          .lte("date", `${year}-${month}-31`);

        // 4. Combine
        const serviceWithHours = {
          ...serviceData,
          generalHours: generalHours || [],
          customHours: customHours || [],
        };

        setService(serviceWithHours);
      } catch (err) {
        console.error("Failed to load service with hours:", err);
      }
    })();
  }, [serviceId, initialService]);

  // Handle booking
  const handleBooking = async () => {
    console.log("handleBooking clicked", { user, selectedDate, selectedTime, service });

    if (!selectedDate || !selectedTime || !service) {
      console.warn("Missing date/time/service");
      return;
    }

    if (isBookingInProgress) return;
    setIsBookingInProgress(true);

    if (!user) {
      localStorage.setItem(
        "pendingBooking",
        JSON.stringify({
          serviceId: service.id,
          selectedDate,
          selectedTime,
        })
      );
      console.warn("No user, opening login...");
      openLogin();
      setIsBookingInProgress(false);
      return;
    }

    console.log("Ensuring phone...");
    const hasPhone = await ensurePhone();
    console.log("ensurePhone() result:", hasPhone);
    if (!hasPhone) {
      console.warn("No phone → aborting booking");
      setIsBookingInProgress(false);
      return;
    }

    console.log("Phone verified, creating booking...");
    await createBooking();
  };

  const createBooking = async () => {
    console.log("createBooking started");
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

      console.log("Supabase insert result:", { data, error });

      if (error) {
        alert("Er is iets misgegaan bij het boeken. Probeer opnieuw.");
        return;
      }

      setShowSuccess(true);
      console.log("Appointment created successfully!");

      setTimeout(() => {
        router.push("/");
      }, 3000);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
    } catch (err) {
      console.error("Exception during booking:", err);
      alert("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setSaving(false);
      setIsBookingInProgress(false);
    }
  };

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
          <Timeslots
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
            service={service}
          />
        )}

        <button
          type="button"
          disabled={!selectedDate || !selectedTime || saving || isBookingInProgress}
          className={`plannen-button ${selectedDate && selectedTime ? "active" : ""}`}
          onClick={handleBooking}
        >
          {saving ? "Bezig..." : isBookingInProgress ? "Bezig..." : "Bevestig afspraak"}
        </button>

        {message && <p className="confirmation-message">{message}</p>}
      </div>

      {MiniPhoneModal}

      {showSuccess && (
        <div className="modal-overlay mini-blocker">
          <div className="mini-modal-content">
            <h3>Afspraak bevestigd!</h3>
            <p>Bedankt voor je boeking — we zien je binnenkort!</p>
          </div>
        </div>
      )}
    </main>
  );
}