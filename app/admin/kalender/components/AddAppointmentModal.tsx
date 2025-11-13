"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { getTimeslotsForDate } from "@/app/services/timeslotsEngine";
import { GeneralHour, CustomHour, BlockedHour } from "@/app/types/scheduling";

export default function AddAppointmentModal({
  open,
  onClose,
  onAdded,
  generalHours,
  customHours,
  blockedHours,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
  generalHours: GeneralHour[];
  customHours: CustomHour[];
  blockedHours: BlockedHour[];
}) {
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");

  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

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

  // Load available times
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setTimes([]);
      return;
    }

    (async () => {
      setLoadingTimes(true);

      const { data: rows } = await supabase
        .from("appointments")
        .select(`
          time,
          status,
          services:service_id (
            duration_minutes,
            buffer_minutes
          )
        `)
        .eq("date", selectedDate)
        .neq("status", "cancelled");

      const appointments = (rows ?? []).map((a: any) => {
        const svc = a.services?.[0];
        return {
          time: a.time,
          duration_minutes: svc?.duration_minutes ?? selectedService.duration_minutes,
          buffer_minutes: svc?.buffer_minutes ?? selectedService.buffer_minutes,
        }
      });




      const activeBlocked = blockedHours.filter((b) => b.blocked_date === selectedDate);

      const slots = getTimeslotsForDate({
        date: selectedDate,
        service: selectedService,
        generalHours,
        customHours,
        blockedHours: activeBlocked,
        appointments: appointments ?? [],
      });

      setTimes(slots);
      setLoadingTimes(false);
    })();
  }, [selectedDate, selectedService, generalHours, customHours, blockedHours]);

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedService || !selectedDate || !selectedTime)
      return alert("Vul alle velden in.");
    setStep("confirm");
  };

  // Confirm insert
  const handleConfirm = async () => {
    const { error } = await supabase.from("appointments").insert({
      user_id: selectedClient,
      service_id: selectedService.id,
      date: selectedDate,
      time: selectedTime,
      status: "confirmed",
    });

    if (error) {
      console.error("❌ FOUT:", error);
      alert("Kon afspraak niet opslaan.");
      return;
    }

    setStep("success");
    setTimeout(() => {
      onAdded?.();
      onClose();
      setStep("form");
      resetForm();
    }, 1500);
  };

  const resetForm = () => {
    setSelectedClient("");
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
  };

  if (!open) return null;

  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        {step === "form" && (
          <>
            <h3 style={title}>Nieuwe Afspraak</h3>

            <form onSubmit={handleSubmit} style={form}>
              {/* CLIENT */}
              <label style={label}>Klant</label>
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

              {/* SERVICE */}
              <label style={label}>Behandeling</label>
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

              {/* DATE */}
              <label style={label}>Datum</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                style={input}
              />

              {/* TIME */}
              <label style={label}>Tijdslot</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                style={dropdown}
              >
                <option value="">Kies tijd</option>
                {loadingTimes && <option>Laden...</option>}
                {!loadingTimes &&
                  times.map((t: string) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>

              <div style={btnRow}>
                <button type="button" onClick={onClose} style={cancelBtn}>
                  Annuleren
                </button>
                <button type="submit" style={confirmBtn}>
                  Volgende
                </button>
              </div>
            </form>
          </>
        )}

        {/* CONFIRM */}
        {step === "confirm" && (
          <div style={{ textAlign: "center" }}>
            <h3 style={title}>Bevestig Afspraak</h3>
            <p><strong>Klant:</strong> {clients.find(c => c.id === selectedClient)?.full_name}</p>
            <p><strong>Behandeling:</strong> {selectedService?.name}</p>
            <p><strong>Datum:</strong> {selectedDate}</p>
            <p><strong>Tijd:</strong> {selectedTime}</p>
            <div style={btnRow}>
              <button onClick={() => setStep("form")} style={cancelBtn}>Terug</button>
              <button onClick={handleConfirm} style={confirmBtn}>Bevestigen</button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h3 style={title}>🌸 Afspraak toegevoegd!</h3>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Styles --- */
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 60,
};

const modal: React.CSSProperties = {
  width: "min(90vw,420px)",
  background: "#fff",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
};

const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "12px" };
const title: React.CSSProperties = { textAlign: "center", color: "var(--vv-primary)" };
const label: React.CSSProperties = { fontWeight: 600 };

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: 10,
  border: "1px solid var(--vv-border)",
};

const dropdown = { ...input, background: "#fff", cursor: "pointer" };
const btnRow = { display: "flex", justifyContent: "flex-end", gap: "10px" };

const cancelBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  background: "#fafafa",
  border: "1px solid #ddd",
  cursor: "pointer",
};

const confirmBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  background: "var(--vv-primary)",
  color: "#fff",
  cursor: "pointer",
};
