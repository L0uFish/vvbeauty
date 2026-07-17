// app/plannen/PlannenInner.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import Calendar from "./Calendar";
import Timeslots from "./Timeslots";
import { useUser } from "@/app/context/UserContext";
import { useAuthUI } from "@/app/context/AuthUIContext";
import { useRequirePhone } from "@/app/hooks/useRequirePhone";
import { CustomHour, GeneralHour } from "@/app/types/scheduling";
import "../styles/plannen.css";

type BookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
  generalHours: GeneralHour[];
  customHours: CustomHour[];
};

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
};

export default function PlannenInner({
  initialService,
}: {
  initialService: BookingService;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { openLogin } = useAuthUI();
  const { ensurePhone, MiniPhoneModal } = useRequirePhone();

  const [showSuccess, setShowSuccess] = useState(false);
  const [service, setService] = useState<BookingService | null>(initialService);
  const [selectedServices, setSelectedServices] = useState<BookingService[]>(
    initialService ? [initialService] : []
  );
  const [availableServices, setAvailableServices] = useState<BookingService[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);

  const serviceId = searchParams?.get("service");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const preDate = params.get("date");
    const preTime = params.get("time");
    if (preDate) setSelectedDate(preDate);
    if (preTime) setSelectedTime(preTime);
  }, []);

  useEffect(() => {
    if (!initialService) return;
    setService(initialService);
    setSelectedServices([initialService]);
    setSelectedTime(null);
  }, [initialService]);

  useEffect(() => {
    if (!serviceId || serviceId === initialService?.id) return;

    (async () => {
      try {
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name, description, duration_minutes, buffer_minutes, active")
          .eq("id", serviceId)
          .single();

        if (serviceError || !serviceData) {
          console.error("Service not found:", serviceError);
          return;
        }

        const { data: generalHours } = await supabase.from("general_hours").select("*");

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const { data: customHours } = await supabase
          .from("custom_hours")
          .select("date, open_time, close_time, is_closed, notes")
          .gte("date", `${year}-${month}-01`)
          .lte("date", `${year}-${month}-31`);

        const serviceWithHours = {
          ...serviceData,
          generalHours: generalHours || [],
          customHours: customHours || [],
        } as BookingService;

        setService(serviceWithHours);
        setSelectedServices([serviceWithHours]);
        setSelectedDate(null);
        setSelectedTime(null);
      } catch (err) {
        console.error("Failed to load service with hours:", err);
      }
    })();
  }, [serviceId, initialService]);

  useEffect(() => {
    if (!initialService) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("id, name, description, duration_minutes, buffer_minutes, active")
          .order("name", { ascending: true });

        if (error) throw error;

        const servicesWithHours = (data as ServiceRow[] | null ?? [])
          .filter((item) => item.active || item.id === initialService.id)
          .map((item) => ({
            ...item,
            generalHours: initialService.generalHours || [],
            customHours: initialService.customHours || [],
          }));

        setAvailableServices(servicesWithHours);
      } catch (err) {
        console.error("Failed to load available services:", err);
      }
    })();
  }, [initialService]);

  const totalBookingMinutes = selectedServices.reduce(
    (sum, serviceEntry) => sum + serviceEntry.duration_minutes + serviceEntry.buffer_minutes,
    0
  );

  const addableServices = availableServices.filter(
    (serviceOption) => !selectedServices.some((selected) => selected.id === serviceOption.id)
  );

  const handleAddServices = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(event.target.selectedOptions).map((option) => option.value);
    if (!selectedIds.length) return;

    const servicesToAdd = availableServices.filter((serviceOption) =>
      selectedIds.includes(serviceOption.id)
    );

    setSelectedServices((currentServices) => {
      const currentIds = new Set(currentServices.map((serviceEntry) => serviceEntry.id));
      const merged = [...currentServices];

      servicesToAdd.forEach((serviceOption) => {
        if (!currentIds.has(serviceOption.id)) {
          merged.push(serviceOption);
          currentIds.add(serviceOption.id);
        }
      });

      return merged;
    });

    setSelectedTime(null);
    setShowAddService(false);

    Array.from(event.target.options).forEach((option) => {
      option.selected = false;
    });
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || selectedServices.length === 0 || !service) {
      console.warn("Missing date/time/service");
      return;
    }

    if (isBookingInProgress) return;
    setIsBookingInProgress(true);

    if (!user) {
      localStorage.setItem(
        "pendingBooking",
        JSON.stringify({
          serviceId: selectedServices[0].id,
          selectedDate,
          selectedTime,
        })
      );
      openLogin();
      setIsBookingInProgress(false);
      return;
    }

    const hasPhone = await ensurePhone();
    if (!hasPhone) {
      setIsBookingInProgress(false);
      return;
    }

    await createBooking();
  };

  const createBooking = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const appointmentsToInsert = selectedServices.map((serviceEntry) => ({
        service_id: serviceEntry.id,
        user_id: user.id,
        date: selectedDate,
        time: selectedTime,
        status: "pending",
      }));

      const { data, error } = await supabase
        .from("appointments")
        .insert(appointmentsToInsert)
        .select();

      if (error) {
        alert("Er is iets misgegaan bij het boeken. Probeer opnieuw.");
        return;
      }

      const appointmentIds = (data ?? [])
        .map((appointment: { id?: string }) => appointment.id)
        .filter((id): id is string => Boolean(id));

      for (const appointmentId of appointmentIds) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-booking-email", {
            body: { appointment_id: appointmentId },
          });

          if (emailError) {
            console.error("Failed to send booking email:", emailError);
          }
        } catch (emailErr) {
          console.error("Booking email invocation crashed:", emailErr);
        }
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push("/profile");
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
      <div className={`plannen-card ${service.active ? "" : "inactive-service"}`}>
        <h1 className="plannen-title">{service.name}</h1>
        <p className="plannen-description">{service.description}</p>
        {!service.active && (
          <p className="plannen-inactive-note">
            Deze dienst staat inactief, maar blijft zichtbaar voor admins.
          </p>
        )}

        <div className="service-selection-section">
          <div className="service-selection-pills">
            {selectedServices.map((serviceEntry) => (
              <span key={serviceEntry.id} className="service-pill">
                {serviceEntry.name}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="plannen-button secondary"
            onClick={() => setShowAddService((current) => !current)}
          >
            Dienst toevoegen
          </button>

          {showAddService && (
            <div className="service-selector">
              {addableServices.length > 0 ? (
                <>
                  <label className="service-selector-label" htmlFor="extra-services-select">
                    Kies één of meerdere extra diensten
                  </label>
                  <select
                    id="extra-services-select"
                    className="service-selector-select"
                    multiple
                    size={6}
                    onChange={handleAddServices}
                  >
                    {addableServices.map((serviceOption) => (
                      <option key={serviceOption.id} value={serviceOption.id}>
                        {serviceOption.name} ({serviceOption.duration_minutes} min)
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="service-selector-help">Er zijn geen extra diensten meer beschikbaar.</p>
              )}
            </div>
          )}

          <p className="plannen-duration">Totale geplande tijd: {totalBookingMinutes} minuten</p>
        </div>

        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        {selectedDate && (
          <Timeslots
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
            services={selectedServices}
          />
        )}

        <button
          type="button"
          disabled={!selectedDate || !selectedTime || saving || isBookingInProgress || selectedServices.length === 0}
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
