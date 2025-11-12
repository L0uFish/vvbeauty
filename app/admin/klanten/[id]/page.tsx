"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Appointment } from "@/app/types/scheduling";


type ClientRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  notes: string | null;
};

export default function ClientDetail({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // === FETCH CLIENT + APPOINTMENTS ===
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: clientData, error: clientErr } = await supabase
        .from("clients")
        .select("id, full_name, phone, email, notes")
        .eq("id", id)
        .single();

      if (clientErr) console.error(clientErr);
      setClient(clientData);

      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select(
          `
          id, date, time, status,
          service:services(name, price, promo_price)
        `
        )
        .eq("user_id", id)
        .order("date", { ascending: false });

      if (apptErr) console.error(apptErr);

      // ✅ QUICK FIX: bypass type mismatch
      setAppointments((appts as any) ?? []);
      setLoading(false);
    })();
  }, [supabase, id]);

  // === INLINE UPDATE HANDLER ===
  const handleInlineUpdate = async (
    field: keyof ClientRow,
    value: string
  ) => {
    if (!client) return;
    const { error } = await supabase
      .from("clients")
      .update({ [field]: value })
      .eq("id", client.id);
    if (error) return alert("❌ Fout bij updaten.");
    setClient({ ...client, [field]: value });
  };

  // === STATS ===
  const totalSpent = appointments.reduce((sum, a) => {
    const price =
      (a as any).service?.promo_price ??
      (a as any).service?.price ??
      0;
    return sum + price;
  }, 0);

  const mostBookedService =
    appointments.length > 0
      ? Object.entries(
          appointments.reduce((acc, a) => {
            const name = (a as any).service?.name ?? "Onbekend";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number })
        ).sort((a, b) => b[1] - a[1])[0][0]
      : "—";

  const future = appointments.filter(
    (a) => new Date(a.date) >= new Date()
  );
  const past = appointments.filter(
    (a) => new Date(a.date) < new Date()
  );
  const nextAppt = future[future.length - 1];
  const lastAppt = past[0];

  return (
    <div className="client-detail-page">
      {loading && <p>Laden…</p>}
      {!loading && client && (
        <>
          {/* ===== CLIENT HEADER ===== */}
          <div className="client-top">
            <EditableField
              label="Naam"
              value={client.full_name}
              field="full_name"
              onSave={handleInlineUpdate}
            />
            <EditableField
              label="Telefoon"
              value={client.phone}
              field="phone"
              onSave={handleInlineUpdate}
            />
            <EditableField
              label="E-mail"
              value={client.email}
              field="email"
              onSave={handleInlineUpdate}
            />
            <EditableField
              label="Notitie"
              value={client.notes ?? ""}
              field="notes"
              onSave={handleInlineUpdate}
            />
          </div>

          {/* ===== HIGHLIGHTS ===== */}
          <div className="appt-highlights">
            <div>
              <h4>Volgende afspraak</h4>
              <p>
                {nextAppt
                  ? `${nextAppt.date} om ${nextAppt.time}`
                  : "Geen geplande afspraken"}
              </p>
            </div>
            <div>
              <h4>Laatste afspraak</h4>
              <p>
                {lastAppt
                  ? `${lastAppt.date} om ${lastAppt.time}`
                  : "Nog geen eerdere afspraken"}
              </p>
            </div>
            <div>
              <h4>Meest geboekt</h4>
              <p>{mostBookedService}</p>
            </div>
            <div>
              <h4>Totaal uitgegeven</h4>
              <p>€{totalSpent.toFixed(2)}</p>
            </div>
          </div>

          {/* ===== APPOINTMENT LIST ===== */}
          <div className="appt-list">
            <h3>Toekomstige afspraken</h3>
            {future.length === 0 && <p>Geen toekomstige afspraken.</p>}
            {future.map((a) => (
              <div key={a.id} className="appt-item">
                <span>
                  {a.date} – {a.time}
                </span>
                <span>
                  {(a as any).service?.name} (€
                  {(a as any).service?.promo_price ??
                    (a as any).service?.price ??
                    "?"})
                </span>
              </div>
            ))}

            <h3>Voorbije afspraken</h3>
            {past.length === 0 && <p>Geen voorbije afspraken.</p>}
            {past.map((a) => (
              <div key={a.id} className="appt-item">
                <span>
                  {a.date} – {a.time}
                </span>
                <span>
                  {(a as any).service?.name} (€
                  {(a as any).service?.promo_price ??
                    (a as any).service?.price ??
                    "?"})
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ===== EditableField Component ===== */
function EditableField({
  label,
  value,
  field,
  onSave,
}: {
  label: string;
  value: string | null;
  field: keyof ClientRow;
  onSave: (field: keyof ClientRow, value: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value ?? "");

  useEffect(() => setV(value ?? ""), [value]);

  const handleSave = () => {
    setEdit(false);
    if (v.trim() !== (value ?? "")) onSave(field, v.trim());
  };

  return (
    <div className="editable-field" onDoubleClick={() => setEdit(true)}>
      <strong>{label}:</strong>{" "}
      {!edit ? (
        <span>{value || "—"}</span>
      ) : (
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setEdit(false);
              setV(value ?? "");
            }
          }}
        />
      )}
    </div>
  );
}
