"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/AgendaManager.css";

type Appointment = {
  id: string;
  date: string;
  time: string;
  status: string;
  services?: { name: string | null };
  clients?: { full_name: string | null };
};

export default function AgendaManager() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sortColumn, setSortColumn] = useState<"client" | "service" | "date" | "time">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOption, setFilterOption] = useState("all");

  useEffect(() => {
    const fetchAppointments = async () => {
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
    };

    fetchAppointments();
  }, []);

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
      `Weet je zeker dat je de afspraak van ${appointment.clients?.full_name || "Onbekende klant"} wilt annuleren?`
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
      prev.map((a) => (a.id === appointment.id ? { ...a, status: "cancelled" } : a))
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
      <input
        type="text"
        placeholder="Search appointments..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar"
      />

      <div className="radio-buttons">
        {["today", "nextDay", "nextWeek", "allFuture", "past", "all"].map((opt) => (
          <label
            key={opt}
            onClick={() => setFilterOption(opt)}
            className={filterOption === opt ? "active" : ""}
          >
            {opt === "today"
              ? "Today"
              : opt === "nextDay"
              ? "Next Day"
              : opt === "nextWeek"
              ? "Next Week"
              : opt === "allFuture"
              ? "All Future"
              : opt === "past"
              ? "Past"
              : "All"}
          </label>
        ))}
      </div>

      <table className="appointments-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("client")}>
              Name {sortColumn === "client" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("service")}>
              Service {sortColumn === "service" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("date")}>
              Date {sortColumn === "date" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("time")}>
              Time {sortColumn === "time" && (sortDirection === "asc" ? "↑" : "↓")}
            </th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(groupedByDate).map(([dateGroup, groupAppointments]) => (
            <>
              {sortColumn === "date" && (
                <tr className="date-group-header" key={dateGroup}>
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
                      {new Date(a.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td>{a.time}</td>
                    <td>
                      {isCancelled ? (
                        "Canceled"
                      ) : (
                        <button
                          className="cancel-btn"
                          onClick={() => cancelAppointment(a)}
                        >
                          Annuleren
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="date-separator" />
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
