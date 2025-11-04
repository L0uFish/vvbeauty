"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "./phoneModal.css";

export default function PhoneModal({
  open,
  onClose,
  userId,
  onPhoneUpdated,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onPhoneUpdated?: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanAndValidatePhone = (raw: string) => {
    let cleaned = raw.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    const valid =
      /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned);
    console.log(`Phone cleaned: ${cleaned}, valid: ${valid}`);
    return valid ? cleaned : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleaned = cleanAndValidatePhone(phone);
    if (!cleaned) {
      setErrorMsg(
        "Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14)."
      );
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("clients")
        .update({ phone: cleaned })
        .eq("id", userId);

      if (error) throw error;

      console.log("✅ Phone number updated successfully.");
      onPhoneUpdated?.();
      onClose();
    } catch (err) {
      console.error("⚠️ Error updating phone number:", err);
      setErrorMsg("Kon telefoonnummer niet opslaan.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <h2 className="modal-title">Vul je telefoonnummer in</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="tel"
            placeholder="Telefoonnummer"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          {errorMsg && <p className="error-message">{errorMsg}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Opslaan..." : "Opslaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
