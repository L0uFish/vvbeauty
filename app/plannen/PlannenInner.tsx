"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Calendar from "./Calendar";
import Timeslots from "./Timeslots";
import LoginModal from "@/app/components/LoginModal";
import "./plannen.css";

export default function PlannenInner() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  // 🔹 Fetch user session (detect if logged in)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔹 Fetch service data
  useEffect(() => {
    if (!serviceId) return;
    const fetchService = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .single();
      if (!error) setService(data);
      setLoading(false);
    };
    fetchService();
  }, [serviceId]);

  // 🔹 Handle new appointment
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !service) return;

    // Require login before continuing
    if (!session) {
      setShowLogin(true);
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("appointments").insert([
      {
        service_id: service.id,
        user_id: session.user.id,
        date: selectedDate,
        time: selectedTime,
        status: "pending",
      },
    ]);

    if (error) {
      console.error(error);
      setMessage("❌ Er is iets misgegaan bij het boeken. Probeer opnieuw.");
    } else {
      const formattedDate = new Date(selectedDate).toLocaleDateString("nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      setMessage(`✅ Je afspraak is ingepland voor ${formattedDate} om ${selectedTime}.`);
      setSelectedTime(null);
      setSelectedDate(null);
    }

    setSaving(false);
  };

  // 🔹 Loading / fallback states
  if (!serviceId) {
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <h2 className="plannen-title">Geen dienst geselecteerd</h2>
          <p className="plannen-description">
            Gelieve eerst een dienst te kiezen via de Diensten-pagina.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <p className="plannen-description">Dienst wordt geladen...</p>
        </div>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="plannen-container">
        <div className="plannen-card">
          <h2 className="plannen-title">Dienst niet gevonden</h2>
        </div>
      </main>
    );
  }

  // 🔹 Main UI
  return (
    <main className="plannen-container">
      <div className="plannen-card">
        <h1 className="plannen-title">{service.name}</h1>
        <p className="plannen-description">{service.description}</p>

        <div className="plannen-price-container">
          <div className="plannen-price">
            {service.promo_price ? (
              <>
                <span className="line">€{service.price}</span>
                <span className="promo">€{service.promo_price}</span>
              </>
            ) : (
              <>€{service.price}</>
            )}
          </div>
          <div className="plannen-duration">{service.duration_minutes} min</div>
        </div>

        {/* Calendar */}
        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Timeslots */}
        {selectedDate && (
          <Timeslots
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />
        )}

        {/* Confirm Button */}
        <button
          type="button"
          disabled={!selectedDate || !selectedTime || saving}
          className={`plannen-button ${
            selectedDate && selectedTime ? "active" : ""
          }`}
          onClick={handleBooking}
        >
          {saving ? "Bezig..." : "Bevestig afspraak"}
        </button>

        {message && <p className="confirmation-message">{message}</p>}
      </div>

      {/* Login Modal Overlay */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={() => {
          setShowLogin(false);
          handleBooking(); // automatically re-try booking after login
        }}
      />
    </main>
  );
}
