"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  most_booked_service: string | null;
  avg_price: number | null;
};

export default function KlantenPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof ClientRow>("full_name");
  const [asc, setAsc] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async ()=>{
    setLoading(true);
    // Example view: join appointments/services to compute aggregates (you can materialise a SQL view)
    const { data, error } = await supabase.rpc("clients_with_stats"); // ← create a Postgres function/view or replace with manual queries
    if (error) console.error(error);
    setRows((data ?? []) as ClientRow[]);
    setLoading(false);
  })(); }, [supabase]);

  const filtered = rows.filter(r => {
    const hay = `${r.full_name} ${r.email} ${r.phone}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }).sort((a,b)=>{
    const va = (a[sortKey] ?? "") as any;
    const vb = (b[sortKey] ?? "") as any;
    const cmp = (typeof va==="number" && typeof vb==="number") ? va - vb :
                String(va).localeCompare(String(vb), "nl");
    return asc ? cmp : -cmp;
  });

  const setSort = (k: keyof ClientRow) => {
    if (sortKey===k) setAsc(!asc);
    else { setSortKey(k); setAsc(true); }
  };

  const handleInlineUpdate = async (id:string, key: keyof ClientRow, value:string) => {
    if (key!=="full_name" && key!=="email" && key!=="phone") return;
    const { error } = await supabase.from("clients").update({ [key]: value }).eq("id", id);
    if (error) return alert("Fout bij updaten.");
    setRows(prev => prev.map(r => r.id===id ? { ...r, [key]: value } : r));
  };

  const handleDelete = async (id:string) => {
    if (!confirm("Deze klant verwijderen? Dit kan niet ongedaan gemaakt worden.")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return alert("Fout bij verwijderen.");
    setRows(prev => prev.filter(r => r.id!==id));
  };

  return (
    <div>
      <h1>Klanten</h1>
      <div className="list-controls">
        <input placeholder="Zoek naam / telefoon / e-mail…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="table">
        <div className="thead">
          <div onClick={()=>setSort("full_name")}>Naam</div>
          <div onClick={()=>setSort("email")}>E-mail</div>
          <div onClick={()=>setSort("phone")}>Telefoon</div>
          <div onClick={()=>setSort("most_booked_service")}>Meest geboekt</div>
          <div onClick={()=>setSort("avg_price")}>Gem. prijs</div>
          <div>Acties</div>
        </div>
        <div className="tbody">
          {loading && <div className="muted">Laden…</div>}
          {!loading && filtered.map(r=>(
            <div className="tr" key={r.id}>
              <EditableCell value={r.full_name} onSave={(v)=>handleInlineUpdate(r.id,"full_name",v)} />
              <EditableCell value={r.email} onSave={(v)=>handleInlineUpdate(r.id,"email",v)} />
              <EditableCell value={r.phone} onSave={(v)=>handleInlineUpdate(r.id,"phone",v)} />
              <div>{r.most_booked_service ?? "—"}</div>
              <div>{r.avg_price?.toFixed(2) ?? "—"}</div>
              <div><button className="danger" onClick={()=>handleDelete(r.id)}>X</button></div>
            </div>
          ))}
          {!loading && filtered.length===0 && <div className="muted">Geen resultaten.</div>}
        </div>
      </div>
    </div>
  );
}

function EditableCell({ value, onSave }:{ value:string; onSave:(v:string)=>void }) {
  const [v, setV] = useState(value);
  const [edit, setEdit] = useState(false);
  useEffect(()=>setV(value),[value]);
  return (
    <div className="cell" onDoubleClick={()=>setEdit(true)}>
      {!edit ? <span>{value || "—"}</span> : (
        <input
          autoFocus
          value={v}
          onChange={e=>setV(e.target.value)}
          onBlur={()=>{ setEdit(false); if (v!==value) onSave(v); }}
          onKeyDown={e=>{ if (e.key==="Enter") { (e.target as HTMLInputElement).blur(); } if (e.key==="Escape"){ setEdit(false); setV(value); } }}
        />
      )}
    </div>
  );
}
