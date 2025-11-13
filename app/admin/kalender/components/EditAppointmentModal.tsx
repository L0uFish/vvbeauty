"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { getTimeslotsForDate } from "@/app/services/timeslotsEngine";
import { GeneralHour, CustomHour, BlockedHour } from "@/app/types/scheduling";

export default function EditAppointmentModal({
  open,
  onClose,
  appointment,
  onUpdated,
  generalHours,
  customHours,
  blockedHours,
}: {
  open: boolean;
  onClose: () => void;
  appointment: any;
  onUpdated?: () => void;
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
  const [selectedStatus, setSelectedStatus] = useState<string>("confirmed");

  const [step, setStep] = useState<"form" | "confirm" | "success">("form");

  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load clients + services
  useEffect(() => {
    if (!open) return;

    (async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("clients").select("id, full_name").order("full_name"),
        supabase
          .from("services")
          .select("id, name, duration_minutes, buffer_minutes")
          .order("name"),
      ]);

      setClients(c ?? []);
      setServices(s ?? []);
    })();
  }, [open]);

  // Prefill fields
  useEffect(() => {
    if (!open || !appointment) return;

    setSelectedClient(appointment.user_id);
    setSelectedDate(appointment.date);
    setSelectedTime(appointment.time);
    setSelectedStatus(appointment.status);
  }, [open, appointment]);

  // Pick the original service
  useEffect(() => {
    if (!appointment || services.length === 0) return;
    const svc = services.find((s) => s.id === appointment.service_id);
    if (svc) setSelectedService(svc);
  }, [services, appointment]);

  // Load timeslots
  useEffect(() => {
    if (!selectedDate || !selectedService) return;

    (async () => {
      setLoading(true);

      const { data: appointments } = await supabase
        .from("appointments")
        .select("time, duration_minutes, buffer_minutes, status")
        .eq("date", selectedDate)
        .not("status", "eq", "cancelled");
        
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
      setLoading(false);
    })();
  }, [selectedDate, selectedService, generalHours, customHours, blockedHours]);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedService || !selectedDate || !selectedTime) {
      alert("Vul alle velden in.");
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const { error } = await supabase
      .from("appointments")
      .update({
        user_id: selectedClient,
        service_id: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        status: selectedStatus,
      })
      .eq("id", appointment.id);

    if (error) {
      console.error("❌ Fout bij aanpassen afspraak:", error);
      alert("Fout bij opslaan van afspraak");
      return;
    }

    setStep("success");
    setTimeout(() => {
      onUpdated?.();
      onClose();
      setStep("form");
    }, 1500);
  };

  if (!open || !appointment) return null;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        {/* FORM */}
        {step === "form" && (
          <>
            <h3 style={title}>Afspraak bewerken</h3>

            <form onSubmit={submitForm} style={form}>
              <label>Klant</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                style={dropdown}
              >
                <option value="">Kies klant</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>

              <label>Behandeling</label>
              <select
                value={selectedService?.id || ""}
                onChange={(e) =>
                  setSelectedService(services.find((s) => s.id === e.target.value) || null)
                }
                style={dropdown}
              >
                <option value="">Kies service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label>Datum</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={input}
              />

              <label>Tijdslot</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                style={dropdown}
              >
                <option value="">Kies tijd</option>
                {loading && <option>Laden...</option>}
                {!loading &&
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
            <h3 style={title}>Bevestigen</h3>
            <p><strong>Klant:</strong> {clients.find(c => c.id === selectedClient)?.full_name}</p>
            <p><strong>Behandeling:</strong> {selectedService?.name}</p>
            <p><strong>Datum:</strong> {selectedDate}</p>
            <p><strong>Tijd:</strong> {selectedTime}</p>

            <div style={btnRow}>
              <button onClick={() => setStep("form")} style={cancelBtn}>
                Terug
              </button>
              <button onClick={handleConfirm} style={confirmBtn}>
                Opslaan
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h3 style={title}>🌸 Afspraak aangepast!</h3>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Styles --- */
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
};

const modal: React.CSSProperties = {
  background: "#fff",
  padding: 22,
  width: "min(90vw, 420px)",
  borderRadius: 18,
  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
};

const title: React.CSSProperties = {
  marginBottom: 12,
  textAlign: "center",
  color: "var(--vv-primary)",
};

const form: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const dropdown = input;

const btnRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const cancelBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "#f1f1f1",
  border: "1px solid #ddd",
  cursor: "pointer",
};

const confirmBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "var(--vv-primary)",
  color: "#fff",
  cursor: "pointer",
  border: "none",
};
