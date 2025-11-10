"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
// 🟢 The logic is fixed in the imported function
import { cleanAndValidatePhone } from "@/app/hooks/useRequirePhone"; 

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // 🟢 Use the imported, consistent validation logic
    const cleaned = cleanAndValidatePhone(phone); 
    
    if (!cleaned) {
      setErrorMsg(
        "Voer een geldig Belgisch telefoonnummer in (bv. 0482 45 56 42)."
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
            placeholder="Telefoonnummer (bv. 0482 45 56 42)"
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