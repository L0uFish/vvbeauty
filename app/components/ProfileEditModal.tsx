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
  initialData?: { full_name?: string; email?: string; phone?: string };
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");  // Use phone instead of tel

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name || "");
      setEmail(initialData.email || "");
      setPhone(initialData.phone || ""); // Default to empty string if no phone
    }
  }, [initialData]);

  // Only render if mounted and open props are true
  if (!mounted || !open) return null;

  const cleanAndValidatePhone = (raw: string) => {
    console.log("📞 Cleaning phone number:", raw);
    let cleaned = raw.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    const valid =
      /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned); // Validate Belgian number
    return valid ? cleaned : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    console.log("📝 Submitting profile update...");

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      setErrorMsg("Geen actieve gebruiker gevonden.");
      setLoading(false);
      return;
    }

    // Clean and validate the phone number
    const cleanedPhone = cleanAndValidatePhone(phone);
    if (!cleanedPhone) {
      setErrorMsg("Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14).");
      setLoading(false);
      return;
    }

    try {
      // Update user info in "users" table
      const { error: tableError } = await supabase
        .from("clients") // Ensure table name is 'clients' as per your structure
        .update({
          full_name: fullName,
          email,
          phone: cleanedPhone, // Ensure you're updating the correct column (phone)
        })
        .eq("id", user.id);

      if (tableError) throw tableError;

      // Update Supabase Auth metadata if there are changes
      const updates: any = {};
      if (email !== user.email) updates.email = email;
      if (fullName !== user.user_metadata?.full_name) {
        updates.data = { ...(updates.data || {}), full_name: fullName };
      }
      if (cleanedPhone !== user.user_metadata?.phone) {
        updates.data = { ...(updates.data || {}), phone: cleanedPhone };
      }

      if (Object.keys(updates).length > 0) {
        const { error: metaError } = await supabase.auth.updateUser(updates);
        if (metaError) throw metaError;
      }

      setSuccessMsg("Je gegevens zijn succesvol bijgewerkt!");
      onUpdated?.();

      // Close the modal after a short delay
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

  // Modal content
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
