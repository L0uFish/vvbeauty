"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/UsersManager.css"; // reuse same styling for now

export default function ServiceAddModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [buffer, setBuffer] = useState("");
  const [category, setCategory] = useState("");

  // Distinct categories from database
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);

  // Fetch all existing categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("category")
        .not("category", "is", null);

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      // Extract distinct category names
      const distinct = Array.from(
        new Set(data.map((row) => row.category.trim()).filter(Boolean))
      );
      setCategories(distinct);
    };

    if (open) fetchCategories();
  }, [open]);

  if (!mounted || !open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.from("services").insert([
        {
          name,
          description,
          category,
          price,
          promo_price: promoPrice || null,
          duration_minutes: parseInt(duration),
          buffer_minutes: parseInt(buffer),
          active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setSuccessMsg("Service toegevoegd!");
      onAdded?.();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error adding service:", err);
      setErrorMsg("Er ging iets mis bij het opslaan. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2 className="modal-title">Nieuwe Service Toevoegen</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <textarea
            placeholder="Beschrijving"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ minHeight: "80px" }}
          />

          {/* --- Category with datalist --- */}
          <input
            type="text"
            placeholder="Categorie"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="category-options"
            required
          />
          <datalist id="category-options">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>

          <input
            type="number"
            placeholder="Prijs (€)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Promo prijs (€)"
            value={promoPrice}
            onChange={(e) => setPromoPrice(e.target.value)}
          />

          <input
            type="number"
            placeholder="Duur (minuten)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Buffer (minuten)"
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            required
          />

          {errorMsg && <p className="error-message">{errorMsg}</p>}
          {successMsg && (
            <p className="success-message">{successMsg}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Toevoegen..." : "Toevoegen"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
