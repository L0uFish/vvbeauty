"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import '../../styles/AgendaManager.css'; // Import the dedicated CSS file

export default function AgendaManager() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterOption, setFilterOption] = useState<string>("all");

  // Fetch the appointments from Supabase
  useEffect(() => {
    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name), clients(full_name)")
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching appointments:", error);
        return;
      }

      setAppointments(data);
    };

    fetchAppointments();
  }, []);

  // Sort function
  const sortTable = (column: string) => {
    const sortedData = [...appointments];
    const isAscending = sortDirection === "asc";

    sortedData.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];

      // If the column is a date, convert them to Date objects for correct comparison
      if (column === "date") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) {
        return isAscending ? -1 : 1;
      }
      if (aValue > bValue) {
        return isAscending ? 1 : -1;
      }
      return 0;
    });

    setAppointments(sortedData);
    setSortDirection(isAscending ? "desc" : "asc");
  };

  // Filter appointments based on search term
  const filteredAppointments = appointments.filter((appointment) => {
    return (
      (appointment["clients.full_name"]?.toLowerCase() ?? "")
        .includes(searchTerm.toLowerCase()) ||
      (appointment["services.name"]?.toLowerCase() ?? "")
        .includes(searchTerm.toLowerCase()) ||
      (appointment.date?.toLowerCase() ?? "")
        .includes(searchTerm.toLowerCase()) ||
      (appointment.time?.toLowerCase() ?? "")
        .includes(searchTerm.toLowerCase())
    );
  });

  // Filter appointments based on selected filter option (Today, Next Day, etc.)
  const filterAppointments = () => {
    const today = new Date();
    const nextDay = new Date();
    nextDay.setDate(today.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    if (filterOption === "today") {
      return filteredAppointments.filter(
        (appointment) => new Date(appointment.date).toDateString() === today.toDateString()
      );
    } else if (filterOption === "nextDay") {
      return filteredAppointments.filter(
        (appointment) => new Date(appointment.date).toDateString() === nextDay.toDateString()
      );
    } else if (filterOption === "nextWeek") {
      return filteredAppointments.filter(
        (appointment) =>
          new Date(appointment.date) >= today && new Date(appointment.date) <= nextWeek
      );
    } else if (filterOption === "allFuture") {
      return filteredAppointments.filter((appointment) => new Date(appointment.date) >= today);
    } else if (filterOption === "past") {
      return filteredAppointments.filter((appointment) => new Date(appointment.date) < today);
    } else if (filterOption === "all") {
      return filteredAppointments; // Show all appointments if no specific filter is selected
    } else {
      return filteredAppointments; // Show all appointments if no specific filter is selected
    }
  };

  return (
    <div className="agenda-manager">
      {/* Search bar */}
      <input
        type="text"
        placeholder="Search appointments..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar"
      />

      {/* Filter options */}
      <div className="radio-buttons">
        <label
          onClick={() => setFilterOption("today")}
          className={filterOption === "today" ? "active" : ""}
        >
          Today
        </label>
        <label
          onClick={() => setFilterOption("nextDay")}
          className={filterOption === "nextDay" ? "active" : ""}
        >
          Next Day
        </label>
        <label
          onClick={() => setFilterOption("nextWeek")}
          className={filterOption === "nextWeek" ? "active" : ""}
        >
          Next Week
        </label>
        <label
          onClick={() => setFilterOption("allFuture")}
          className={filterOption === "allFuture" ? "active" : ""}
        >
          All Future Appointments
        </label>
        <label
          onClick={() => setFilterOption("past")}
          className={filterOption === "past" ? "active" : ""}
        >
          Past Appointments
        </label>
        <label
          onClick={() => setFilterOption("all")}
          className={filterOption === "all" ? "active" : ""}
        >
          All Appointments
        </label>
      </div>

      {/* Table */}
      <table className="appointments-table">
        <thead>
          <tr>
            <th onClick={() => sortTable("clients.full_name")}>Name</th>
            <th onClick={() => sortTable("services.name")}>Service</th>
            <th onClick={() => sortTable("date")}>Date</th>
            <th onClick={() => sortTable("time")}>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
            {filterAppointments().map((appointment: any) => {
                const { full_name } = appointment["clients"];
                const { name } = appointment["services"];

                const formattedDate = new Date(appointment.date).toLocaleDateString(
                "en-GB",
                { year: "numeric", month: "long", day: "numeric" }
                );

                // Check if the appointment is canceled
                const isCancelled = appointment.status === "cancelled";

                return (
                <tr
                    key={appointment.id}
                    style={{
                    textDecoration: isCancelled ? "line-through" : "none",
                    color: isCancelled ? "#9ca3af" : "inherit", // Grayish color for canceled
                    fontStyle: isCancelled ? "italic" : "normal", // Italic for canceled
                    }}
                >
                    <td>{full_name}</td>
                    <td>{name}</td>
                    <td>{formattedDate}</td>
                    <td>{appointment.time}</td>
                    <td>
                    {isCancelled ? "Canceled" : ""}
                    </td>
                </tr>
                );
            })}
            </tbody>
      </table>
    </div>
  );
}
