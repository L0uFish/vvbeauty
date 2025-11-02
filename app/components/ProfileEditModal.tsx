"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import "./loginModal.css"; // reuse same styling

export default function ProfileEditModal({
  open,
  onClose,
  onUpdated,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  initialData?: { full_name?: string; email?: string; tel?: string };
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.tel || "");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name || "");
      setEmail(initialData.email || "");
      setPhone(initialData.tel || "");
    }
  }, [initialData]);

  if (!mounted || !open) return null;

  const cleanAndValidatePhone = (raw: string) => {
    let cleaned = raw.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    const valid =
      /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned);
    return valid ? cleaned : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMsg(null);
  setSuccessMsg(null);
  setLoading(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setErrorMsg("Geen actieve gebruiker gevonden.");
    setLoading(false);
    return;
  }

  const cleanedPhone = cleanAndValidatePhone(phone);
  if (!cleanedPhone) {
    setErrorMsg(
      "Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14)."
    );
    setLoading(false);
    return;
  }

  try {
    // 1️⃣ Update in users table
    const { error: tableError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        email,
        tel: cleanedPhone,
      })
      .eq("id", user.id);

    if (tableError) throw tableError;

    // 2️⃣ Update in Supabase auth metadata (only if changed)
    const updates: any = {};
    if (email !== user.email) updates.email = email;
    if (fullName !== user.user_metadata?.full_name) {
      updates.data = { ...(updates.data || {}), full_name: fullName };
    }
    if (cleanedPhone !== user.user_metadata?.tel) {
      updates.data = { ...(updates.data || {}), tel: cleanedPhone };
    }

    if (Object.keys(updates).length > 0) {
      const { error: metaError } = await supabase.auth.updateUser(updates);
      if (metaError) throw metaError;
    }

    setSuccessMsg("Je gegevens zijn succesvol bijgewerkt!");
    onUpdated?.();

    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1000);
  } catch (err: any) {
    console.error("Error updating profile:", err);
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

        <h2 className="modal-title">Gegevens wijzigen</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Volledige naam"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="Telefoonnummer"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/[^\d+]/g, "").replace(/\s+/g, ""))
            }
            required
          />

          {errorMsg && <p className="error-message">{errorMsg}</p>}
          {successMsg && (
            <p
              style={{
                color: "#4CAF50",
                fontWeight: 500,
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              {successMsg}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
