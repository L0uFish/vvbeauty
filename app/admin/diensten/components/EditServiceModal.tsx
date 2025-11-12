"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";
import { Service } from "../types/service";
import { useRouter } from "next/navigation";

export default function EditServiceModal({
  svc,
  onClose,
}: {
  svc: Service;
  onClose: () => void;
}) {
  const router = useRouter();

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [form, setForm] = useState({
    name: svc.name,
    description: svc.description || "",
    category: svc.category,
    price: svc.price,
    promo_price: svc.promo_price || "",
    duration_minutes: svc.duration_minutes.toString(),
    buffer_minutes: svc.buffer_minutes.toString(),
    active: svc.active,
  });

  useEffect(() => {
    supabase
      .from("services")
      .select("category")
      .then(({ data }) => {
        const uniq = Array.from(new Set(data?.map((s) => s.category) ?? [])).sort();
        setCategories(uniq);
      });
  }, []);

  async function handleUpdate() {
    const finalCategory = newCategory || form.category;

    const { error } = await supabase
      .from("services")
      .update({
        name: form.name,
        description: form.description || null,
        category: finalCategory,
        price: form.price,
        promo_price: form.promo_price || null,
        duration_minutes: parseInt(form.duration_minutes),
        buffer_minutes: parseInt(form.buffer_minutes),
        active: form.active,
      })
      .eq("id", svc.id);

    if (error) {
      alert("Fout bij opslaan");
      console.error(error);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dienst bewerken</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <label>
            Naam *
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label>
            Beschrijving
            <textarea
              className="input textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label>
            Categorie
            <div className="category-flex">
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Nieuwe categorie..."
                className="input"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
          </label>

          <div className="grid-2">
            <label>
              Prijs (€) *
              <input
                type="number"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>

            <label>
              Promo prijs (€)
              <input
                type="number"
                className="input"
                value={form.promo_price}
                onChange={(e) => setForm({ ...form, promo_price: e.target.value })}
              />
            </label>
          </div>

          <div className="grid-2">
            <label>
              Duur (min) *
              <input
                type="number"
                className="input"
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm({ ...form, duration_minutes: e.target.value })
                }
              />
            </label>

            <label>
              Buffer (min)
              <input
                type="number"
                className="input"
                value={form.buffer_minutes}
                onChange={(e) =>
                  setForm({ ...form, buffer_minutes: e.target.value })
                }
              />
            </label>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Actief
          </label>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn cancel">
            Annuleren
          </button>
          <button onClick={handleUpdate} className="btn save">
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
