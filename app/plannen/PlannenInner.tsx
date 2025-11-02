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
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    email: "",
    fullName: "",
    tel: "",
  });

  // 🔹 Fetch user session (detect if logged in)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔹 Fetch service data
  useEffect(() => {
  let active = true; // ✅ prevent state updates after unmount

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
      } else if (!data) {
        console.warn("No data returned for serviceId:", serviceId);
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

  // Cleanup to avoid async leaks
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

    // 🔹 Fetch user info to verify tel
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name, tel")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userError) {
      console.error("User fetch error:", userError);
      return;
    }

    // 🔹 If tel missing, show the mini modal
    if (!userData?.tel) {
      setProfileData({
        email: userData?.email || session.user.email || "",
        fullName:
          userData?.full_name ||
          session.user.user_metadata?.full_name ||
          "",
        tel: "",
      });
      setShowCompleteProfile(true);
      return;
    }

    // Otherwise, continue booking
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
          <div className="plannen-duration">
            {service.duration_minutes} min
          </div>
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

      {/* Login Modal */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={() => {
          setShowLogin(false);
          handleBooking(); // retry booking after login
        }}
      />

      {/* Mini modal for phone number */}
      {showCompleteProfile && (
        <div className="modal-overlay mini-blocker">
          <div
            className="mini-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Vul je gegevens aan</h3>
            <p>We missen nog je telefoonnummer.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                // 🧹 Clean input
                let cleaned = profileData.tel
                  .trim()
                  .replace(/\s+/g, "")
                  .replace(/[^\d+]/g, "");

                if (cleaned.startsWith("00")) {
                  cleaned = "+" + cleaned.slice(2); // convert 0032 → +32
                }

                // ✅ Valid formats:
                const valid =
                  /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned);

                if (!valid) {
                  alert(
                    "Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14)."
                  );
                  return;
                }

                const { error } = await supabase
                  .from("users")
                  .update({ tel: cleaned })
                  .eq("id", session.user.id);

                if (error) {
                  alert("Kon telefoonnummer niet opslaan.");
                  console.error(error);
                  return;
                }

                setShowCompleteProfile(false);
                handleBooking(); // retry booking now that phone is saved
              }}
              className="mini-form"
            >
              <input type="text" value={profileData.fullName} disabled />
              <input type="email" value={profileData.email} disabled />
              <input
                type="tel"
                placeholder="Telefoonnummer"
                value={profileData.tel}
                onChange={(e) => {
                  // Clean while typing
                  const val = e.target.value
                    .replace(/[^\d+]/g, "")
                    .replace(/\s+/g, "");
                  setProfileData({ ...profileData, tel: val });
                }}
                required
                autoFocus
              />
              <button type="submit" className="mini-submit">
                Opslaan en verdergaan
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
