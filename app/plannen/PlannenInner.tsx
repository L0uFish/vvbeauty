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
  const [showSpinner, setShowSpinner] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  // 🧩 NEW: mini modal for missing phone
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState("");

  // 🔹 Fetch user session (detect if logged in)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔹 Delay spinner appearance to prevent quick flash
  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 🔹 Fetch service data safely
  useEffect(() => {
    let active = true;

    const fetchService = async () => {
      if (!serviceId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("id", serviceId)
          .single();

        if (!active) return;

        if (error) {
          console.error("Supabase fetch error:", error);
          setService(null);
        } else {
          setService(data);
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        if (active) setService(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchService();

    return () => {
      active = false;
    };
  }, [serviceId]);

  // 🔹 Handle new appointment
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !service) return;

    // Require login before continuing
    if (!session) {
      setShowLogin(true);
      return;
    }

    // 🔹 Check user phone before booking
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("tel")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user:", userError);
      return;
    }

    if (!userData?.tel) {
      // no phone → show modal
      setShowPhoneModal(true);
      return;
    }

    // continue booking
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
      setMessage(
        `✅ Je afspraak is ingepland voor ${formattedDate} om ${selectedTime}.`
      );
      setSelectedTime(null);
      setSelectedDate(null);
    }

    setSaving(false);
  };

  // 🔹 Save phone number & retry booking
  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleaned = phone.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    const valid =
      /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned);

    if (!valid) {
      alert(
        "Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14)."
      );
      return;
    }

    try {
      await supabase
        .from("users")
        .update({ tel: cleaned })
        .eq("id", session.user.id);

      setShowPhoneModal(false);
      setPhone("");
      handleBooking(); // retry
    } catch (err) {
      console.error("Error updating tel:", err);
      alert("Kon telefoonnummer niet opslaan.");
    }
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

  if (loading && showSpinner) {
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
          <div className="plannen-duration">
            {service.duration_minutes} min
          </div>
        </div>

        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {selectedDate && (
          <Timeslots
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />
        )}

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

      {/* Login Modal */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={() => {
          setShowLogin(false);
          handleBooking(); // retry booking after login
        }}
      />

      {/* Phone completion mini modal */}
      {showPhoneModal && (
        <div className="modal-overlay mini-blocker" onClick={() => setShowPhoneModal(false)}>
          <div className="mini-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Vul je telefoonnummer in</h3>
            <p>We hebben je nummer nodig om de afspraak te bevestigen.</p>
            <form onSubmit={handleSavePhone} className="mini-form">
              <input
                type="tel"
                placeholder="Telefoonnummer"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" className="mini-submit">Opslaan</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
