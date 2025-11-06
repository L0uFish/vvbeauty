"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/AgendaManager.css";
import React from "react";

// --- Types ---
type Appointment = {
  id: string;
  date: string;
  time: string;
  status: string;
  services?: { name: string | null };
  clients?: { full_name: string | null };
};

type Client = {
  id: string;
  full_name: string | null;
};

type Service = {
  id: string;
  name: string | null;
};

// --- Appointment Modal Component ---
interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  services: Service[];
  onAdd: (newAppointment: {
    user_id: string;
    service_id: string;
    date: string;
    time: string;
  }) => Promise<void>;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  clients,
  services,
  onAdd,
}) => {
  const [userId, setUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !serviceId || !date || !time) {
      alert("Vul alle velden in.");
      return;
    }

    try {
      await onAdd({ user_id: userId, service_id: serviceId, date, time });
      onClose(); // Close modal on success
      // Reset form fields
      setUserId("");
      setServiceId("");
      setDate("");
      setTime("");
    } catch (error) {
      console.error("Error adding appointment:", error);
      alert("Er ging iets mis bij het toevoegen van de afspraak.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
        <h2>Afspraak Toevoegen</h2>
        <form onSubmit={handleSubmit} className="appointment-form">
          <label>
            Klant:
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Selecteer Klant</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Service:
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
            >
              <option value="">Selecteer Service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Datum:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <label>
            Tijd:
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="add-btn">
            Afspraak Opslaan
          </button>
        </form>
      </div>
    </div>
  );
};
// --- AgendaManager Component ---

export default function AgendaManager() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<
    "client" | "service" | "date" | "time"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOption, setFilterOption] = useState("all");

  const fetchAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, services(name), clients(full_name)")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error);
      return;
    }

    setAppointments(data as Appointment[]);
  }, []);

  const fetchDropdownData = async () => {
    // Fetch Clients
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (clientError) {
      console.error("Error fetching clients:", clientError);
    } else {
      setClients(clientData as Client[]);
    }

    // Fetch Services
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("id, name")
      .eq("active", true) // Assuming you only want active services
      .order("name", { ascending: true });

    if (serviceError) {
      console.error("Error fetching services:", serviceError);
    } else {
      setServices(serviceData as Service[]);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDropdownData();
  }, [fetchAppointments]);

  const addAppointment = async (newAppointment: {
    user_id: string;
    service_id: string;
    date: string;
    time: string;
  }) => {
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          user_id: newAppointment.user_id,
          service_id: newAppointment.service_id,
          date: newAppointment.date,
          time: newAppointment.time,
          status: "confirmed",
        },
      ])
      .select()
      .single(); // Get the inserted row

    if (error) {
      console.error("Error inserting appointment:", error);
      throw error;
    }

    // Fetch the client and service names for the table display
    const client = clients.find((c) => c.id === newAppointment.user_id);
    const service = services.find((s) => s.id === newAppointment.service_id);

    // Manually construct the new appointment object with nested client/service info
    const addedAppointment: Appointment = {
      id: data.id,
      date: data.date,
      time: data.time,
      status: data.status,
      clients: { full_name: client?.full_name || "Onbekend" },
      services: { name: service?.name || "Onbekend" },
    };

    setAppointments((prev) => [addedAppointment, ...prev]);
  };

  const handleSort = (column: "client" | "service" | "date" | "time") => {
    const isAscending = sortColumn === column ? sortDirection === "asc" : true;
    setSortColumn(column);
    setSortDirection(isAscending ? "desc" : "asc");

    const sorted = [...appointments].sort((a, b) => {
      let aValue = "";
      let bValue = "";

      switch (column) {
        case "client":
          aValue = a.clients?.full_name?.toLowerCase() || "";
          bValue = b.clients?.full_name?.toLowerCase() || "";
          break;
        case "service":
          aValue = a.services?.name?.toLowerCase() || "";
          bValue = b.services?.name?.toLowerCase() || "";
          break;
        case "date":
          aValue = a.date;
          bValue = b.date;
          break;
        case "time":
          aValue = a.time;
          bValue = b.time;
          break;
      }

      if (aValue < bValue) return isAscending ? -1 : 1;
      if (aValue > bValue) return isAscending ? 1 : -1;
      return 0;
    });

    setAppointments(sorted);
  };

  // Filter logic (unchanged)
  const filteredAppointments = appointments.filter((a) => {
    const client = a.clients?.full_name?.toLowerCase() || "";
    const service = a.services?.name?.toLowerCase() || "";
    return (
      client.includes(searchTerm.toLowerCase()) ||
      service.includes(searchTerm.toLowerCase()) ||
      a.date.includes(searchTerm) ||
      a.time.includes(searchTerm)
    );
  });

  const today = new Date();
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const filterAppointments = () => {
    return filteredAppointments.filter((a) => {
      const d = new Date(a.date);
      switch (filterOption) {
        case "today":
          return d.toDateString() === today.toDateString();
        case "nextDay":
          return d.toDateString() === nextDay.toDateString();
        case "nextWeek":
          return d >= today && d <= nextWeek;
        case "allFuture":
          return d >= today;
        case "past":
          return d < today;
        default:
          return true;
      }
    });
  };

  const cancelAppointment = async (appointment: Appointment) => {
    const confirmCancel = window.confirm(
      `Weet je zeker dat je de afspraak van ${
        appointment.clients?.full_name || "Onbekende klant"
      } wilt annuleren?`
    );
    if (!confirmCancel) return;

    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointment.id);

    if (error) {
      console.error("Error cancelling appointment:", error);
      alert("Er ging iets mis bij het annuleren.");
      return;
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointment.id ? { ...a, status: "cancelled" } : a
      )
    );
  };

  const groupedByDate =
    sortColumn === "date"
      ? filterAppointments().reduce((acc: Record<string, Appointment[]>, a) => {
          const dateLabel = new Date(a.date).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          if (!acc[dateLabel]) acc[dateLabel] = [];
          acc[dateLabel].push(a);
          return acc;
        }, {})
      : { All: filterAppointments() };

  return (
    <div className="agenda-manager">
      <div className="controls-header">
        <input
          type="text"
          placeholder="Zoeken op naam..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        <button
          className="add-appointment-btn"
          onClick={() => setIsModalOpen(true)}
        >
          ➕ Nieuwe Afspraak
        </button>
      </div>

      <div className="radio-buttons">
        {["today", "nextDay", "nextWeek", "allFuture", "past", "all"].map(
          (opt) => (
            <label
              key={opt}
              onClick={() => setFilterOption(opt)}
              className={filterOption === opt ? "active" : ""}
            >
              {opt === "today"
                ? "Vandaag"
                : opt === "nextDay"
                ? "Morgen"
                : opt === "nextWeek"
                ? "Volgende Week"
                : opt === "allFuture"
                ? "Toekomst"
                : opt === "past"
                ? "Verleden"
                : "Alles"}
            </label>
          )
        )}
      </div>

      <table className="appointments-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("client")}>
              Naam {sortColumn === "client" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("service")}>
              Service {sortColumn === "service" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("date")}>
              Datum {sortColumn === "date" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("time")}>
              Tijd {sortColumn === "time" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(groupedByDate).map(([dateGroup, groupAppointments]) => (
            <React.Fragment key={dateGroup}>
              {sortColumn === "date" && (
                <tr className="date-group-header">
                  <td colSpan={5}>{dateGroup}</td>
                </tr>
              )}

              {groupAppointments.map((a) => {
                const isCancelled = a.status === "cancelled";
                return (
                  <tr
                    key={a.id}
                    className={isCancelled ? "cancelled-row" : ""}
                  >
                    <td>{a.clients?.full_name || "Onbekende klant"}</td>
                    <td>{a.services?.name || "Verwijderde service"}</td>
                    <td>
                      {new Date(a.date).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td>{a.time}</td>
                    <td>
                      {isCancelled ? (
                        "Geannuleerd"
                      ) : (
                        <button
                          className="cancel-btn"
                          onClick={() => cancelAppointment(a)}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Soft separator row for spacing between date groups */}
              <tr className="date-separator" key={`sep-${dateGroup}`}>
                <td colSpan={5}></td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clients={clients}
        services={services}
        onAdd={addAppointment}
      />
    </div>
  );
}