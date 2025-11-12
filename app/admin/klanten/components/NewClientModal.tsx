"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "@/app/admin/styles/klanten.css";

export default function NewClientModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      alert("Naam en e-mail zijn verplicht.");
      return;
    }

    try {
      setSaving(true);
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            notes: notes.trim() || null,
            role: "client",
          },
        },
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          alert("❌ Dit e-mailadres is al geregistreerd.");
        } else {
          alert("❌ Fout bij aanmaken van gebruiker: " + authError.message);
        }
        setSaving(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await onAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Er ging iets mis bij het opslaan van de klant.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-client-modal" onClick={onClose}>
      <div className="add-client-content" onClick={(e) => e.stopPropagation()}>
        <h3>Nieuwe Klant</h3>

        <input
          placeholder="Volledige naam *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          placeholder="E-mailadres *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Telefoonnummer"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          placeholder="Notities (optioneel)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{
            resize: "none",
            borderRadius: "8px",
            border: "1px solid var(--vv-border)",
            padding: "8px 10px",
            fontFamily: "var(--font-main)",
            fontSize: "14px",
          }}
        />

        <div className="add-client-actions">
          <button onClick={onClose} className="cancel">
            Annuleren
          </button>
          <button
            onClick={handleSave}
            className="confirm"
            disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
