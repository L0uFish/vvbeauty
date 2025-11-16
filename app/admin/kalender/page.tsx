"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

import AdminCalendarLayout from "./components/AdminCalendarLayout";
import ActionChooserModal from "./components/ActionChooserModal";
import DayView from "./components/DayView";
import MonthView from "./components/MonthView";
import YearView from "./components/YearView";
import ListView from "./components/ListView";
import EditBlockHoursModal from "./components/EditBlockHoursModal";

import {
  View,
  Appointment,
  BlockedHour,
  GeneralHour,
  CustomHour,
} from "@/app/types/scheduling";

import AddAppointmentModal from "./components/AddAppointmentModal";
import EditAppointmentModal from "./components/EditAppointmentModal";
import CustomHoursModal from "./components/CustomHoursModal";
import BlockHoursModal from "./components/BlockHoursModal";

import "@/app/admin/styles/kalender.css";

/* ------------------------------------------------------------------ */
/*  SAFE DATE HELPERS (NO TIMEZONE SHIFT)                             */
/* ------------------------------------------------------------------ */

function getDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* ------------------------------------------------------------------ */

export default function KalenderPage() {
  const [view, setView] = useState<View>("month");
  const [cursorDate, setCursorDate] = useState(() => new Date());

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedHours, setBlockedHours] = useState<BlockedHour[]>([]);
  const [generalHours, setGeneralHours] = useState<GeneralHour[]>([]);
  const [customHours, setCustomHours] = useState<CustomHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [editBlockOpen, setEditBlockOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockedHour | null>(null);

  const handleEditBlock = (block: BlockedHour) => {
    setSelectedBlock(block);
    setEditBlockOpen(true);
  }

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  // Day action modal
  const [dayActionsOpen, setDayActionsOpen] = useState(false);
  const [selectedDayISO, setSelectedDayISO] = useState("");
  // Batch selection support
const [batchDates, setBatchDates] = useState<string[] | null>(null);


  // Top action chooser
  const [chooserOpen, setChooserOpen] = useState(false);

  /* ------------------------ Action Picker -------------------------- */

  const openChooser = () => setChooserOpen(true);
  const closeChooser = () => setChooserOpen(false);

  const handlePickAction = (
    action: "add-appointment" | "custom-hours" | "block-hours"
  ) => {
    closeChooser();
    if (action === "add-appointment") setAddOpen(true);
    if (action === "custom-hours") setCustomOpen(true);
    if (action === "block-hours") setBlockOpen(true);
  };

  /* --------------------- Click Appointment → Edit ------------------ */

  const handleEditAppointment = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setEditOpen(true);
  };

  /* ----------------------- Click Date in MonthView ----------------- */

  const handleOpenDayActions = (d: Date) => {
    const iso = getDateKey(d);
    setSelectedDayISO(iso);
    setDayActionsOpen(true);
  };

  /* -------------------------- FETCH DATA ---------------------------- */

  useEffect(() => {
    (async () => {
      setLoading(true);

      let startISO = "";
      let endISO = "";

      /* LIST VIEW → GET ALL FUTURE APPOINTMENTS */
      if (view === "list") {
        startISO = getDateKey(new Date()); // today
        endISO = "9999-12-31"; // max future
      }

      /* DAY VIEW */
      else if (view === "day") {
        const start = new Date(cursorDate);
        const end = new Date(cursorDate);
        end.setDate(end.getDate() + 1);
        startISO = getDateKey(start);
        endISO = getDateKey(end);
      }

      /* MONTH VIEW */
      else if (view === "month") {
        const start = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
        const end = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
        startISO = getDateKey(start);
        endISO = getDateKey(end);
      }

      /* YEAR VIEW */
      else if (view === "year") {
        const start = new Date(cursorDate.getFullYear(), 0, 1);
        const end = new Date(cursorDate.getFullYear() + 1, 0, 1);
        startISO = getDateKey(start);
        endISO = getDateKey(end);
      }

      /* ===== APPOINTMENTS ===== */

      const { data: rawAppts } = await supabase
        .from("appointments")
        .select("*")
        .gte("date", startISO)
        .lte("date", endISO)
        .order("date")
        .order("time");

      const serviceIds = [
        ...new Set(rawAppts?.map((a) => a.service_id).filter(Boolean) ?? []),
      ];

      const userIds = [
        ...new Set(rawAppts?.map((a) => a.user_id).filter(Boolean) ?? []),
      ];

      const [{ data: services }, { data: clients }] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, duration_minutes, buffer_minutes")
          .in("id", serviceIds),
        supabase.from("clients").select("id, full_name").in("id", userIds),
      ]);

      const sMap = new Map(services?.map((s) => [s.id, s]) ?? []);
      const cMap = new Map(clients?.map((c) => [c.id, c]) ?? []);

      const mapped =
        rawAppts?.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          service_id: a.service_id,
          date: a.date,
          time: a.time,
          status: a.status,
          note: a.note ?? null,
          client_name: cMap.get(a.user_id)?.full_name ?? "—",
          service_name: sMap.get(a.service_id)?.name ?? "—",
          service: {
            duration_minutes:
              sMap.get(a.service_id)?.duration_minutes ??
              a.duration_minutes ??
              0,
            buffer_minutes:
              sMap.get(a.service_id)?.buffer_minutes ??
              a.buffer_minutes ??
              0,
          },
        })) ?? [];

      /* ===== BLOCKED HOURS ===== */

      const { data: blocks } = await supabase
        .from("blocked_hours")
        .select("id, blocked_date, time_from, time_until, notes, repeat_type")
        .gte("blocked_date", startISO)
        .lte("blocked_date", endISO)
        .order("blocked_date");

      /* ===== GENERAL HOURS ===== */

      const { data: hours } = await supabase
        .from("general_hours")
        .select("weekday, is_closed, open_time, close_time");

      /* ===== CUSTOM HOURS ===== */

      const { data: custom } = await supabase
        .from("custom_hours")
        .select("id, type, date, open_time, close_time, is_closed, notes")
        .gte("date", startISO)
        .lte("date", endISO)
        .order("date");

      /* ===== COMMIT STATE ===== */

      setAppointments(mapped);
      setBlockedHours(blocks ?? []);
      setGeneralHours(hours ?? []);
      setCustomHours(custom ?? []);
      setLoading(false);
    })();
  }, [cursorDate, view]);

  /* ------------------------ Navigation ----------------------------- */

  const movePrev = () => {
    const d = new Date(cursorDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    if (view === "year") d.setFullYear(d.getFullYear() - 1);
    setCursorDate(d);
  };

  const moveNext = () => {
    const d = new Date(cursorDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    if (view === "year") d.setFullYear(d.getFullYear() + 1);
    setCursorDate(d);
  };

  const isClosedDay = (date: Date) => {
    const weekday = date
      .toLocaleString("en-US", { weekday: "long" })
      .toLowerCase();
    const entry = generalHours.find((h) => h.weekday === weekday);
    return entry?.is_closed ?? false;
  };

  const title = (() => {
    const y = cursorDate.getFullYear();
    if (view === "year") return `${y}`;
    if (view === "month")
      return `${cursorDate.toLocaleString("nl-BE", { month: "long" })} ${y}`;
    return cursorDate.toLocaleDateString("nl-BE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
  })();

  /* ------------------------ RENDER -------------------------------- */

  return (
    <>
      <AdminCalendarLayout
        view={view}
        onChangeView={setView}
        title={title}
        showCancelled={showCancelled}
        onToggleCancelled={setShowCancelled}
        onPrev={movePrev}
        onNext={moveNext}
        onOpenActionChooser={openChooser}
      >
        {/* DAY */}
        {!loading && view === "day" && (
          <DayView
            date={cursorDate}
            appts={appointments}
            blocks={blockedHours}
            customHours={customHours}
            generalHours={generalHours}
            showCancelled={showCancelled}
            isClosedDay={isClosedDay}
            onAppointmentUpdated={() => setCursorDate(new Date(cursorDate))}
          />
        )}

        {/* MONTH */}
        {!loading && view === "month" && (
          <MonthView
            date={cursorDate}
            appts={appointments}
            blocks={blockedHours}
            customHours={customHours}
            generalHours={generalHours}
            showCancelled={showCancelled}
            isClosedDay={isClosedDay}
            onOpenDayActions={handleOpenDayActions}
            onBatchCustom={(dates) => {
              setBatchDates(dates);
              setCustomOpen(true);
            }}
            onBatchBlock={(dates) => {
              setBatchDates(dates);
              setBlockOpen(true);
            }}
            onBatchReset={async (dates) => {
              if (!dates.length) return;

              // verwijder custom_hours
              await supabase
                .from("custom_hours")
                .delete()
                .in("date", dates);

              // verwijder blocked_hours
              await supabase
                .from("blocked_hours")
                .delete()
                .in("blocked_date", dates);

              setCursorDate(new Date(cursorDate)); // refresh
            }}
          />
        )}

        {/* YEAR */}
        {!loading && view === "year" && (
          <YearView
            date={cursorDate}
            blocks={blockedHours}
            appts={appointments}
            customHours={customHours}
            showCancelled={showCancelled}
            isClosedDay={isClosedDay}
            onSelectMonth={(iso) => {
              setView("month");
              setCursorDate(parseISO(iso));
            }}
            onSelectDay={(iso) => {
              setView("day");
              setCursorDate(parseISO(iso));
            }}
          />
        )}

        {/* LIST */}
        {!loading && view === "list" && (
          <ListView
            appts={appointments}
            blocks={blockedHours}
            showCancelled={showCancelled}
            onEdit={handleEditAppointment}
            onEditBlock={handleEditBlock}
          />
        )}
      </AdminCalendarLayout>

      {/* ACTION PICKER */}
      <ActionChooserModal
        open={chooserOpen}
        onClose={closeChooser}
        onPick={handlePickAction}
      />

      {/* DAY ACTIONS */}
      {dayActionsOpen && (
        <div
          onClick={() => setDayActionsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 80,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 16,
              width: 300,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, textAlign: "center" }}>
              Acties voor {selectedDayISO}
            </h3>

            <button
              onClick={() => {
                setView("day");
                setCursorDate(parseISO(selectedDayISO));
                setDayActionsOpen(false);
              }}
            >
              ➜ Ga naar dag
            </button>

            <button
              onClick={() => {
                setAddOpen(true);
                setDayActionsOpen(false);
              }}
            >
              + Afspraak toevoegen
            </button>

            <button
              onClick={() => {
                setCustomOpen(true);
                setDayActionsOpen(false);
              }}
            >
              Openingsuren wijzigen
            </button>

            <button
              onClick={() => {
                setBlockOpen(true);
                setDayActionsOpen(false);
              }}
            >
              Blokkeer uren
            </button>

            <button onClick={() => setDayActionsOpen(false)}>Annuleren</button>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AddAppointmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          setCursorDate(new Date(cursorDate));
        }}
        initialDate={selectedDayISO || undefined}
        generalHours={generalHours}
        customHours={customHours}
        blockedHours={blockedHours}
      />

      {editOpen && selectedAppointment && (
        <EditAppointmentModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          appointment={selectedAppointment}
          onUpdated={() => {
            setEditOpen(false);
            setCursorDate(new Date(cursorDate));
          }}
          generalHours={generalHours}
          customHours={customHours}
          blockedHours={blockedHours}
        />
      )}

      <CustomHoursModal
        open={customOpen}
        onClose={() => {
          setCustomOpen(false);
          setBatchDates(null);
        }}
        onSaved={() => {
          setCustomOpen(false);
          setBatchDates(null);
          setCursorDate(new Date(cursorDate));
        }}
        initialDate={batchDates ? undefined : selectedDayISO || undefined}
        initialDates={batchDates || undefined}
      />

      <BlockHoursModal
        open={blockOpen}
        onClose={() => {
          setBlockOpen(false);
          setBatchDates(null);
        }}
        onSaved={() => {
          setBlockOpen(false);
          setBatchDates(null);
          setCursorDate(new Date(cursorDate));
        }}
        initialDate={batchDates ? undefined : selectedDayISO || undefined}
        initialDates={batchDates || undefined}
      />

      {editBlockOpen && selectedBlock && (
      <EditBlockHoursModal
        open={editBlockOpen}
        onClose={() => setEditBlockOpen(false)}
        block={selectedBlock}
        onUpdated={() => {
          setEditBlockOpen(false);
          setCursorDate(new Date(cursorDate)); // refresh view
        }}
      />
    )}
    </>
  );
}
