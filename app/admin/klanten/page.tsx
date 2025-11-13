"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import "@/app/admin/styles/klanten.css";
import NewClientModal from "./components/NewClientModal";

type ClientRow = {
  id: string;
  full_name: string;
  notes: string | null;
  phone: string;
  email: string;
};

export default function KlantenPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id, full_name, notes, phone, email")
      .order("full_name", { ascending: true });

    if (error) console.error(error);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []); // no supabase dependency

  const filtered = rows.filter((r) => {
    const hay =
      `${r.full_name} ${r.notes ?? ""} ${r.phone ?? ""} ${r.email ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const handleInlineUpdate = async (
    id: string,
    key: keyof ClientRow,
    value: string
  ) => {
    const { error } = await supabase
      .from("clients")
      .update({ [key]: value })
      .eq("id", id);

    if (error) return alert("❌ Fout bij updaten.");

    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );
  };

  const handleDelete = async (client: ClientRow) => {
    const confirmName = prompt(
      `⚠️ Typ de naam om te bevestigen:\n\n${client.full_name}`
    );

    if (confirmName !== client.full_name)
      return alert("Naam komt niet overeen, geannuleerd.");

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", client.id);

    if (error) return alert("❌ Fout bij verwijderen.");

    setRows((p) => p.filter((r) => r.id !== client.id));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="client-page">
      <div className="client-toolbar">
        <h1>Klanten</h1>

        <div className="toolbar-controls">
          <input
            className="client-search"
            placeholder="🔍 Zoek naam / notitie / telefoon / e-mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn-addclient"
            onClick={() => setShowAdd(true)}
            title="Nieuwe klant toevoegen"
          >
            ＋ Klant
          </button>
        </div>
      </div>

      <div className="client-table-wrapper">
        <div className="client-table">
          <div className="client-thead">
            <div></div>
            <div>Naam</div>
            <div>Telefoon</div>
            <div>E-mail</div>
            <div>Notitie</div>
            <div></div>
          </div>

          <div className="tbody">
            {loading && <div className="muted">Laden…</div>}

            {!loading &&
              filtered.map((r) => (
                <div className="client-tr" key={r.id}>
                  <div className="profile-icon">
                    <Link href={`/admin/klanten/${r.id}`} title="Bekijk profiel">
                      👤
                    </Link>
                  </div>

                  <EditableCell
                    value={r.full_name}
                    onSave={(v) => handleInlineUpdate(r.id, "full_name", v)}
                  />
                  <EditableCell
                    value={r.phone}
                    onSave={(v) => handleInlineUpdate(r.id, "phone", v)}
                  />
                  <EditableCell
                    value={r.email}
                    onSave={(v) => handleInlineUpdate(r.id, "email", v)}
                  />
                  <NoteCell
                    value={r.notes ?? ""}
                    onSave={(v) => handleInlineUpdate(r.id, "notes", v)}
                  />

                  <div className="client-actions">
                    <button className="btn-delete" onClick={() => handleDelete(r)}>
                      ❌
                    </button>
                  </div>
                </div>
              ))}

            {!loading && filtered.length === 0 && (
              <div className="muted">Geen resultaten.</div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <NewClientModal
          onClose={() => setShowAdd(false)}
          onAdded={async () => {
            await fetchClients();
            showToast("✅ Klant toegevoegd");
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function EditableCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  const [edit, setEdit] = useState(false);

  useEffect(() => setV(value), [value]);

  return (
    <div className="client-cell" onDoubleClick={() => setEdit(true)}>
      {!edit ? (
        <span>{value || "—"}</span>
      ) : (
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            setEdit(false);
            if (v !== value) onSave(v.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEdit(false);
              setV(value);
            }
          }}
        />
      )}
    </div>
  );
}

function NoteCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value);

  useEffect(() => setV(value), [value]);

  return (
    <div className="client-cell" onDoubleClick={() => setEdit(true)}>
      {!edit ? (
        <span title={value}>
          {value && value.length > 40 ? value.slice(0, 40) + "…" : value || "—"}
        </span>
      ) : (
        <textarea
          autoFocus
          rows={3}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            setEdit(false);
            if (v !== value) onSave(v.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEdit(false);
              setV(value);
            }
          }}
        />
      )}
    </div>
  );
}
