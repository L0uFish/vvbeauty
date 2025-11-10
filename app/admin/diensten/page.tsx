"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
  promo_price: number | null;
  duration_minutes: number;
  buffer_minutes: number | null;
  sort: number;           // ordering within category
  cat_sort: number;       // category ordering
};

export default function DienstenPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async ()=>{
    setLoading(true);
    const { data, error } = await supabase.from("services")
      .select("id,name,category,price,promo_price,duration_minutes,buffer_minutes,sort,cat_sort")
      .order("cat_sort", { ascending: true })
      .order("sort", { ascending: true });
    if (error) console.error(error);
    setServices((data ?? []) as Service[]);
    setLoading(false);
  })(); }, [supabase]);

  const categories = Array.from(new Set(services.map(s=>s.category))).sort((a,b)=>{
    const ca = services.find(s=>s.category===a)?.cat_sort ?? 0;
    const cb = services.find(s=>s.category===b)?.cat_sort ?? 0;
    return ca - cb;
  });

  // Drag within category (native HTML5)
  const [dragId, setDragId] = useState<string|null>(null);
  const onDragStart = (id:string) => (e: React.DragEvent) => { setDragId(id); e.dataTransfer.effectAllowed="move"; };
  const onDragOver  = (overId:string) => (e: React.DragEvent) => { e.preventDefault(); if (dragId===overId) return; };
  const onDrop      = (overId:string) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId===overId) return;
    const a = services.find(s=>s.id===dragId)!;
    const b = services.find(s=>s.id===overId)!;
    if (a.category !== b.category) return; // don't leave category
    // swap their sort positions (simple approach)
    const { error } = await supabase.from("services").upsert([
      { id: a.id, sort: b.sort },
      { id: b.id, sort: a.sort },
    ]);
    if (error) return alert("Fout bij herordenen.");
    setServices(prev => prev.map(s=> s.id===a.id ? {...s, sort:b.sort}
                           : s.id===b.id ? {...s, sort:a.sort} : s)
                    .sort((x,y)=> x.cat_sort-y.cat_sort || x.sort-y.sort));
    setDragId(null);
  };

  const saveField = async (id:string, patch: Partial<Service>) => {
    const { error } = await supabase.from("services").update(patch).eq("id", id);
    if (error) return alert("Fout bij updaten.");
    setServices(prev => prev.map(s => s.id===id ? {...s, ...patch} : s));
  };

  // Drag whole category (changes cat_sort)
  const [dragCat, setDragCat] = useState<string|null>(null);
  const onCatDragStart = (cat:string) => (e: React.DragEvent) => { setDragCat(cat); e.dataTransfer.effectAllowed="move"; };
  const onCatDrop = (targetCat:string) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragCat || dragCat===targetCat) return;
    const order = categories.slice();
    const from = order.indexOf(dragCat), to = order.indexOf(targetCat);
    order.splice(to, 0, order.splice(from,1)[0]);
    // persist cat_sort (0..n)
    const patches: {category:string; cat_sort:number}[] = order.map((c,idx)=>({category:c, cat_sort:idx}));
    // Update all services in each category to the new cat_sort
    const updates = patches.flatMap(p => services.filter(s=>s.category===p.category).map(s=>({id:s.id, cat_sort:p.cat_sort})));
    const { error } = await supabase.from("services").upsert(updates);
    if (error) return alert("Fout bij herordenen categorieën.");
    setServices(prev => prev.map(s=>{
      const cs = patches.find(p=>p.category===s.category)!.cat_sort;
      return { ...s, cat_sort: cs };
    }).sort((a,b)=> a.cat_sort-b.cat_sort || a.sort-b.sort));
    setDragCat(null);
  };

  return (
    <div>
      <h1>Diensten</h1>
      {loading && <div className="muted">Laden…</div>}
      {!loading && categories.map(cat=>{
        const items = services.filter(s=>s.category===cat).sort((a,b)=>a.sort-b.sort);
        return (
          <section key={cat}
            className="svc-category"
            draggable
            onDragStart={onCatDragStart(cat)}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={onCatDrop(cat)}
          >
            <header className="svc-cat-header">
              <h3>{cat}</h3>
              <span className="dots" title="Sleep om volgorde te wijzigen">⋮⋮</span>
            </header>
            <ul className="svc-list">
              {items.map(s=>(
                <li key={s.id}
                    className="svc-row"
                    draggable
                    onDragStart={onDragStart(s.id)}
                    onDragOver={onDragOver(s.id)}
                    onDrop={onDrop(s.id)}
                    title="Sleep om volgorde binnen categorie te wijzigen">
                  <span className="grab">⋮⋮</span>
                  <Inline s={s} onSave={saveField} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Inline({ s, onSave }:{ s: Service; onSave:(id:string, patch:Partial<Service>)=>void }) {
  return (
    <>
      <Cell text={s.name} onSave={(v)=>onSave(s.id, { name:v })} />
      <Cell text={String(s.price)} onSave={(v)=>onSave(s.id, { price: Number(v)||0 })} />
      <Cell text={s.promo_price==null?"":String(s.promo_price)} onSave={(v)=>onSave(s.id, { promo_price: v===""?null:(Number(v)||0) })} />
      <Cell text={String(s.duration_minutes)} onSave={(v)=>onSave(s.id, { duration_minutes: Math.max(0, Number(v)||0) })} />
      <Cell text={s.buffer_minutes==null?"":String(s.buffer_minutes)} onSave={(v)=>onSave(s.id, { buffer_minutes: v===""?null:Math.max(0, Number(v)||0) })} />
    </>
  );
}

function Cell({ text, onSave }:{ text:string; onSave:(v:string)=>void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(text);
  useEffect(()=>setV(text),[text]);
  return (
    <div className="cell" onDoubleClick={()=>setEdit(true)}>
      {!edit ? <span>{text || "—"}</span> :
        <input
          autoFocus value={v}
          onChange={e=>setV(e.target.value)}
          onBlur={()=>{ setEdit(false); if (v!==text) onSave(v); }}
          onKeyDown={e=>{ if (e.key==="Enter") (e.target as HTMLInputElement).blur(); if (e.key==="Escape") { setEdit(false); setV(text); } }}
        />
      }
    </div>
  );
}
