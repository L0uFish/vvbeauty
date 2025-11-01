"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Calendar from "./Calendar";
import Timeslots from "./Timeslots";
import "./plannen.css";

export default function Plannen() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service");

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

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
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

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
          disabled={!selectedDate || !selectedTime}
          className={`plannen-button ${
            selectedDate && selectedTime ? "active" : ""
          }`}
        >
          Bevestig afspraak
        </button>
      </div>
    </main>
  );
}
