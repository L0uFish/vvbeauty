"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";
import AdminCalendarLayout from "./components/AdminCalendarLayout";
import ActionChooserModal from "./components/ActionChooserModal";
import DayView from "./components/DayView";
import MonthView from "./components/MonthView";
import YearView from "./components/YearView";
import {
  View,
  Appointment,
  BlockedHour,
  GeneralHour,
  CustomHour,
} from "@/app/types/scheduling";
import AddAppointmentModal from "./components/AddAppointmentModal";
import CustomHoursModal from "./components/CustomHoursModal";
import BlockHoursModal from "./components/BlockHoursModal";
import "@/app/admin/styles/kalender.css";

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function KalenderPage() {
  // ⭐ DEFAULT → MONTH VIEW
  const [view, setView] = useState<View>("month");

  const [cursorDate, setCursorDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedHours, setBlockedHours] = useState<BlockedHour[]>([]);
  const [generalHours, setGeneralHours] = useState<GeneralHour[]>([]);
  const [customHours, setCustomHours] = useState<CustomHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  // action chooser
  const [chooserOpen, setChooserOpen] = useState(false);
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

  // swipe navigation for mobile
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - endX;
    const threshold = 60;
    if (Math.abs(diff) > threshold) diff > 0 ? moveNext() : movePrev();
    touchStartX.current = null;
  };

  // FETCH DATA for current view range
  useEffect(() => {
    (async () => {
      setLoading(true);

      const start = new Date(cursorDate);
      const end = new Date(cursorDate);

      if (view === "day") end.setDate(end.getDate() + 1);
      if (view === "month") {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 1);
      }
      if (view === "year") {
        start.setMonth(0, 1);
        end.setFullYear(end.getFullYear() + 1, 0, 1);
      }

      const startISO = getDateKey(start);
      const endISO = getDateKey(end);

      // --- Appointments ---
      const { data: rawAppts } = await supabase
        .from("appointments")
        .select("*")
        .gte("date", startISO)
        .lt("date", endISO)
        .order("date")
        .order("time");

      const serviceIds = [...new Set(rawAppts?.map(a => a.service_id).filter(Boolean) ?? [])];
      const userIds = [...new Set(rawAppts?.map(a => a.user_id).filter(Boolean) ?? [])];

      const [{ data: services }, { data: clients }] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, duration_minutes, buffer_minutes")
          .in("id", serviceIds),
        supabase.from("clients").select("id, full_name").in("id", userIds),
      ]);

      const sMap = new Map(services?.map((s) => [s.id, s]) ?? []);
      const cMap = new Map(clients?.map((c) => [c.id, c]) ?? []);

      const mapped: Appointment[] =
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
              sMap.get(a.service_id)?.duration_minutes ?? a.duration_minutes,
            buffer_minutes:
              sMap.get(a.service_id)?.buffer_minutes ?? a.buffer_minutes,
          },
        })) ?? [];

      // --- Blocked hours ---
      const { data: blocks } = await supabase
        .from("blocked_hours")
        .select("id, blocked_date, time_from, time_until, notes, repeat_type")
        .gte("blocked_date", startISO)
        .lt("blocked_date", endISO)
        .order("blocked_date");

      // --- General hours ---
      const { data: hours } = await supabase
        .from("general_hours")
        .select("weekday, is_closed, open_time, close_time");

      // --- Custom hours ---
      const { data: custom } = await supabase
        .from("custom_hours")
        .select(
          "id, type, date, open_time, close_time, is_closed, notes"
        )
        .gte("date", startISO)
        .lt("date", endISO)
        .order("date");

      setAppointments(mapped);
      setBlockedHours(blocks ?? []);
      setGeneralHours(hours ?? []);
      setCustomHours(custom ?? []);
      setLoading(false);
    })();
  }, [cursorDate, view]);

  // Navigation
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
    const m = cursorDate.toLocaleString("nl-BE", { month: "long" });
    if (view === "month") return `${m} ${y}`;
    return cursorDate.toLocaleDateString("nl-BE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
  })();

  return (
    <>
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
          {/* === DAY VIEW === */}
          {!loading && view === "day" && (
            <DayView
              date={cursorDate}
              appts={appointments}
              blocks={blockedHours}
              customHours={customHours}
              generalHours={generalHours}
              showCancelled={showCancelled}
              isClosedDay={isClosedDay}
              onAppointmentUpdated={() =>
                setCursorDate(new Date(cursorDate))
              }
            />
          )}

          {/* === MONTH VIEW === */}
          {!loading && view === "month" && (
            <MonthView
              date={cursorDate}
              appts={appointments}
              blocks={blockedHours}
              customHours={customHours}
              generalHours={generalHours}
              showCancelled={showCancelled}
              isClosedDay={isClosedDay}
              onSelectDay={(d) => {
                setView("day");
                setCursorDate(new Date(d));
              }}
            />
          )}

          {/* === YEAR VIEW === */}
          {!loading && view === "year" && (
            <YearView
              date={cursorDate}
              blocks={blockedHours}
              appts={appointments}
              customHours={customHours}
              showCancelled={showCancelled}
              isClosedDay={isClosedDay}
              onSelectMonth={(m) => {
                setView("month");
                setCursorDate(new Date(m));
              }}
              onSelectDay={(d) => {
                setView("day");
                setCursorDate(new Date(d));
              }}
            />
          )}
        </AdminCalendarLayout>
      </div>

      {/* MODALS */}
      <ActionChooserModal
        open={chooserOpen}
        onClose={closeChooser}
        onPick={handlePickAction}
      />

      {addOpen && (
        <AddAppointmentModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            setCursorDate(new Date(cursorDate));
          }}
          generalHours={generalHours}
          customHours={customHours}
          blockedHours={blockedHours}
        />
      )}

      {customOpen && (
        <CustomHoursModal
          open={customOpen}
          onClose={() => setCustomOpen(false)}
          onSaved={() => {
            setCustomOpen(false);
            setCursorDate(new Date(cursorDate));
          }}
        />
      )}

      {blockOpen && (
        <BlockHoursModal
          open={blockOpen}
          onClose={() => setBlockOpen(false)}
          onSaved={() => {
            setBlockOpen(false);
            setCursorDate(new Date(cursorDate));
          }}
        />
      )}
    </>
  );
}
