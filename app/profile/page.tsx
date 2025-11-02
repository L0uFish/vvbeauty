"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "../context/UserContext";
import "../styles/userDashboard.css";
import ProfileEditModal from "../components/ProfileEditModal";

export default function Profiel() {
  const { user, loading } = useUser();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showAllPast, setShowAllPast] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, email, tel")
      .eq("id", user.id)
      .single();
    setUserInfo(profile);

    const { data: appts } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        time,
        status,
        services:service_id(id, name, price)
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    setAppointments(appts || []);
    setLoadingData(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze afspraak wil annuleren?")) return;
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (!error) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
    }
  };

  const handleRebook = (serviceId: string) => {
    window.location.href = `/plannen?service=${encodeURIComponent(serviceId)}`;
  };

  if (loading || loadingData)
    return <main className="user-dashboard">Even geduld...</main>;

  if (!user)
    return (
      <main className="user-dashboard">
        <p>Je bent niet ingelogd.</p>
      </main>
    );

  const today = new Date();

  const upcoming = appointments.filter(
    (a) =>
      a.status !== "cancelled" &&
      new Date(`${a.date}T${a.time}`) >= today
  );

  const past = appointments.filter(
    (a) =>
      a.status === "cancelled" ||
      new Date(`${a.date}T${a.time}`) < today
  );

  const visiblePast = showAllPast ? past : past.slice(0, 3);

  return (
    <main className="user-dashboard">
      {/* === USER INFO === */}
      <section className="user-info">
        <h2>Mijn Gegevens</h2>
        <div className="user-details">
          <p><strong>Naam:</strong> {userInfo?.full_name}</p>
          <p><strong>E-mail:</strong> {userInfo?.email}</p>
          <p><strong>Telefoon:</strong> {userInfo?.tel}</p>
        </div>

        <div className="user-info-actions">
          <button className="edit-btn" onClick={() => setOpenEdit(true)}>
            Gegevens wijzigen
          </button>
        </div>

        <ProfileEditModal
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          onUpdated={() => fetchUserData()}
          initialData={userInfo}
        />
      </section>

      {/* === UPCOMING === */}
      <section id="afspraken" className="user-bookings">
        <h2>Mijn Afspraken</h2>
        {upcoming.length === 0 ? (
          <p>Je hebt geen toekomstige afspraken.</p>
        ) : (
          upcoming.map((a) => (
            <div key={a.id} className={`booking-card ${a.status}`}>
              <div className="booking-info">
                <h3>{a.services?.name}</h3>
                <p>
                  {new Date(a.date).toLocaleDateString("nl-BE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  om {a.time}
                </p>
              </div>

              {a.status !== "cancelled" && (
                <div className="booking-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancel(a.id)}
                  >
                    Annuleer
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* === PAST === */}
      <section className="user-bookings">
        <h2>Vorige Afspraken</h2>
        {past.length === 0 ? (
          <p>Je hebt nog geen vorige afspraken.</p>
        ) : (
          <>
            {visiblePast.map((a) => (
              <div key={a.id} className={`booking-card ${a.status}`}>
                <div className="booking-info">
                  <h3>{a.services?.name}</h3>
                  <p>
                    {new Date(a.date).toLocaleDateString("nl-BE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    om {a.time}
                  </p>
                </div>

                {a.status !== "cancelled" && (
                  <div className="booking-actions">
                    <button
                      className="rebook-btn"
                      onClick={() => handleRebook(a.services?.id)}
                    >
                      Herboek
                    </button>
                  </div>
                )}
              </div>
            ))}

            {past.length > 3 && !showAllPast && (
              <div className="show-more-container">
                <button
                  className="show-more-btn"
                  onClick={() => setShowAllPast(true)}
                >
                  Toon meer
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
