"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useAvailableTimes } from "@/app/hooks/useAvailableTimes";

export default function AddAppointmentModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const { times, loading: loadingTimes } = useAvailableTimes(selectedDate, selectedService);

  // Fetch clients + services
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("clients").select("id, full_name").order("full_name", { ascending: true }),
        supabase
          .from("services")
          .select("id, name, duration_minutes, buffer_minutes")
          .order("name", { ascending: true }),
      ]);
      setClients(c ?? []);
      setServices(s ?? []);
    })();
  }, [open]);

  // Step 1 → Go to confirm screen
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedService || !selectedDate || !selectedTime)
      return alert("Vul alle velden in.");
    setStep("confirm");
  };

  // Step 2 → Confirm appointment insert
  const handleConfirm = async () => {
    const { error } = await supabase.from("appointments").insert({
      user_id: selectedClient,
      service_id: selectedService.id,
      date: selectedDate,
      time: selectedTime,
      status: "confirmed",
    });

    if (error) {
      console.error("❌ Fout bij toevoegen afspraak:", error);
      alert("Fout bij opslaan van afspraak");
    } else {
      setStep("success");
      setTimeout(() => {
        onAdded?.();
        onClose();
        setStep("form");
        resetForm();
      }, 1500);
    }
  };

  const resetForm = () => {
    setSelectedClient("");
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(90vw,420px)",
          background: "#fff",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          fontFamily: "var(--font-main)",
        }}
      >
        {step === "form" && (
          <>
            <h3
              style={{
                color: "var(--vv-primary)",
                margin: "0 0 10px",
                fontFamily: "var(--font-title)",
                textAlign: "center",
              }}
            >
              Nieuwe Afspraak
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontWeight: 500 }}>Klant</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                required
                style={dropdown}
              >
                <option value="">Kies klant</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>

              <label style={{ fontWeight: 500 }}>Behandeling</label>
              <select
                value={selectedService?.id || ""}
                onChange={(e) =>
                  setSelectedService(services.find((s) => s.id === e.target.value) || null)
                }
                required
                style={dropdown}
              >
                <option value="">Kies service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label style={{ fontWeight: 500 }}>Datum</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                style={input}
              />

              <label style={{ fontWeight: 500 }}>Tijdslot</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                style={dropdown}
              >
                <option value="">Kies tijd</option>
                {loadingTimes && <option>Laden...</option>}
                {!loadingTimes &&
                  times.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>

              <div style={btnRow}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ ...button, background: "#fafafa", color: "#555", border: "1px solid #ddd" }}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  style={{
                    ...button,
                    background: "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  Volgende
                </button>
              </div>
            </form>
          </>
        )}

        {step === "confirm" && (
          <div style={{ textAlign: "center" }}>
            <h3 style={{ color: "var(--vv-primary)", marginBottom: "14px" }}>Bevestig Afspraak</h3>
            <p><strong>Klant:</strong> {clients.find(c => c.id === selectedClient)?.full_name}</p>
            <p><strong>Behandeling:</strong> {selectedService?.name}</p>
            <p><strong>Datum:</strong> {new Date(selectedDate).toLocaleDateString("nl-BE")}</p>
            <p><strong>Tijd:</strong> {selectedTime}</p>
            <div style={btnRow}>
              <button onClick={() => setStep("form")} style={{ ...button, background: "#fafafa", color: "#555", border: "1px solid #ddd" }}>
                Terug
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  ...button,
                  background: "linear-gradient(90deg, var(--vv-primary), var(--vv-accent))",
                  color: "#fff",
                  border: "none",
                }}
              >
                Bevestigen
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h3 style={{ color: "var(--vv-primary)" }}>🌸 Afspraak toegevoegd!</h3>
          </div>
        )}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: 10,
  border: "1px solid var(--vv-border)",
  fontFamily: "var(--font-main)",
  fontSize: "0.95rem",
};

const dropdown: React.CSSProperties = {
  ...input,
  background: "#fff",
  cursor: "pointer",
};

const button: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer",
  transition: "0.2s",
};

const btnRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "14px",
};
