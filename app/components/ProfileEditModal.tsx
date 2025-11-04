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
  const [phone, setPhone] = useState(initialData?.phone || ""); 

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name || "");
      setEmail(initialData.email || "");
      setPhone(initialData.phone || "");
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

    try {
      const { data: { user }, error: authUserError } = await supabase.auth.getUser();

      if (authUserError || !user) {
        throw new Error("Geen actieve gebruiker gevonden.");
      }

      // Clean and validate the phone number
      const cleanedPhone = cleanAndValidatePhone(phone);
      if (!cleanedPhone) {
        throw new Error("Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14).");
      }
      
      // --- 1. Update user info in "clients" table (DB) ---
      // NOTE: Do NOT update 'email' here; let the Auth service handle it.
      const { error: tableError } = await supabase
        .from("clients") 
        .update({
          full_name: fullName,
          phone: cleanedPhone, // Corrected to use 'phone' column
        })
        .eq("id", user.id);

      if (tableError) throw tableError;

      // --- 2. Update Supabase Auth metadata and/or email ---
      const updates: { email?: string; data?: Record<string, any> } = {};
      
      // If the email has changed, include it at the root of the updates object (triggers confirmation flow)
      if (email.toLowerCase() !== user.email?.toLowerCase()) {
        updates.email = email;
      }

      // Build metadata update payload
      const metadata: Record<string, any> = {};
      if (fullName !== user.user_metadata?.full_name) {
        metadata.full_name = fullName;
      }
      // Check if the cleaned phone number is different from the stored metadata phone
      if (cleanedPhone !== user.user_metadata?.phone) {
        metadata.phone = cleanedPhone;
      }

      if (Object.keys(metadata).length > 0) {
        updates.data = metadata;
      }

      // Only call updateUser if there's something to update
      if (Object.keys(updates).length > 0) {
        const { error: metaError } = await supabase.auth.updateUser(updates);
        
        if (metaError) {
          // Provide specific user feedback for the email conflict
          if (metaError.message.includes("A user with this email address has already been registered")) {
            // Throw an error that will be caught below to set the specific message
            throw new Error("Het e-mailadres is al in gebruik door een andere gebruiker.");
          }
          // Re-throw any other metadata errors
          throw metaError; 
        }
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
      
      // Catch and display specific, user-friendly error messages
      if (err.message.includes("e-mailadres is al in gebruik")) {
        setErrorMsg(err.message);
      } else if (err.message.includes("telefoonnummer")) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Er ging iets mis bij het opslaan. Probeer opnieuw.");
      }
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