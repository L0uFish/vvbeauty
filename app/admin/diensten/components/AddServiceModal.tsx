"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function AddServiceModal({ onClose }: Props) {
  const router = useRouter();

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    promo_price: "",
    duration_minutes: "",
    buffer_minutes: "",
    active: true,
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

  const handleSubmit = async () => {
    if (!form.name || (!form.category && !newCategory) || !form.price || !form.duration_minutes) {
      alert("Vul naam, categorie, prijs en duur in.");
      return;
    }

    const finalCategory = newCategory || form.category;

    const { data: all } = await supabase
      .from("services")
      .select("display_order, category_order, category");

    const services = all ?? [];

    const sameCat = services.filter((s) => s.category === finalCategory);
    const maxDisplay = Math.max(...sameCat.map((s) => s.display_order ?? 0), 0);
    const maxCatOrder = Math.max(...services.map((s) => s.category_order ?? 0), -1);

    const newDisplayOrder = maxDisplay + 1;
    const newCategoryOrder = services.some((s) => s.category === finalCategory)
      ? maxCatOrder
      : maxCatOrder + 1;

    const { error } = await supabase.from("services").insert({
      name: form.name,
      description: form.description || null,
      category: finalCategory,
      price: form.price,
      promo_price: form.promo_price || null,
      duration_minutes: parseInt(form.duration_minutes, 10),
      buffer_minutes: parseInt(form.buffer_minutes, 10) || 0,
      active: form.active,
      display_order: newDisplayOrder,
      category_order: newCategoryOrder,
    });

    if (error) {
      console.error(error);
      alert("Fout bij opslaan.");
      return;
    }

    onClose();
    router.refresh();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nieuwe dienst toevoegen</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <label>
            Naam *
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Lashlift"
              className="input"
            />
          </label>

          <label>
            Beschrijving
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Krullen van natuurlijke wimpers + kleuren"
              rows={3}
              className="input textarea"
            />
          </label>

          <label>
            Categorie *
            <div className="category-flex">
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Kies categorie</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="input"
                placeholder="Nieuwe categorie..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
          </label>

          <div className="grid-2">
            <label>
              Prijs * (€)
              <input
                type="number"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="55"
              />
            </label>
            <label>
              Promo prijs (€)
              <input
                type="number"
                className="input"
                value={form.promo_price}
                onChange={(e) => setForm({ ...form, promo_price: e.target.value })}
                placeholder="0"
              />
            </label>
          </div>

          <div className="grid-2">
            <label>
              Duur * (min)
              <input
                type="number"
                className="input"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                placeholder="60"
              />
            </label>
            <label>
              Buffer (min)
              <input
                type="number"
                className="input"
                value={form.buffer_minutes}
                onChange={(e) => setForm({ ...form, buffer_minutes: e.target.value })}
                placeholder="20"
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
          <button onClick={handleSubmit} className="btn save">
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
