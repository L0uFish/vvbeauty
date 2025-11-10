"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import "../../styles/modals/loginModal.css"; // reuse same styling
// 🟢 IMPORT THE UNIFIED VALIDATION LOGIC
import { cleanAndValidatePhone } from "@/app/hooks/useRequirePhone"; 

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
  // ⭐ NEW STATE FOR DELETION CONFIRMATION
  const [confirmDelete, setConfirmDelete] = useState(false); 

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

  // 🔴 REMOVED: Duplicated cleanAndValidatePhone function. 
  // We now rely solely on the imported function.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    // Reset delete confirmation if the user is just submitting the form
    setConfirmDelete(false); 
    console.log("📝 Submitting profile update...");

    try {
      const { data: { user }, error: authUserError } = await supabase.auth.getUser();

      if (authUserError || !user) {
        throw new Error("Geen actieve gebruiker gevonden.");
      }

      // 🟢 USE THE IMPORTED, CONSISTENT VALIDATION LOGIC
      const cleanedPhone = cleanAndValidatePhone(phone);
      if (!cleanedPhone) {
        // NOTE: The validation function now handles the trimming and cleaning internally.
        throw new Error("Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14).");
      }
      
      // --- 1. Update user info in "clients" table (DB) ---
      const { error: tableError } = await supabase
        .from("clients") 
        .update({
          full_name: fullName,
          phone: cleanedPhone, // This will now always be the '0...' format
        })
        .eq("id", user.id);

      if (tableError) throw tableError;

      // --- 2. Update Supabase Auth metadata and/or email ---
      const updates: { email?: string; data?: Record<string, any> } = {};
      
      if (email.toLowerCase() !== user.email?.toLowerCase()) {
        updates.email = email;
      }

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
          if (metaError.message.includes("A user with this email address has already been registered")) {
            throw new Error("Het e-mailadres is al in gebruik door een andere gebruiker.");
          }
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

  /**
   * ⭐ NEW FUNCTION: Handles the account deletion process.
   * NOTE: This assumes you have a secure server-side API (e.g., /api/delete-account)
   * that uses the Supabase service_role key to delete the user via the Auth Admin API.
   */
  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setErrorMsg("Bevestig eerst de verwijdering door op de knop te drukken.");
      setConfirmDelete(true); // Ask for confirmation
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    console.log("🔥 Initiating account deletion...");

    try {
      // 1. Get the current user's JWT to send to the server API
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Geen actieve sessie gevonden. Log opnieuw in.");
      }

      // 2. Call the secure server-side endpoint
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Optionally send the JWT for server-side verification
          'Authorization': `Bearer ${session.access_token}`, 
        },
        body: JSON.stringify({ userId: session.user.id }) 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fout bij het verwijderen van de account.");
      }

      // 3. If successful, sign the user out client-side
      await supabase.auth.signOut();
      
      setSuccessMsg("Je account is succesvol verwijderd. Je wordt nu uitgelogd.");
      
      // Close the modal and trigger the global update/redirect after a short delay
      setTimeout(() => {
        onUpdated?.(); // Should trigger a redirect/state update in parent component
        onClose();
        // Force a page reload/redirect to ensure a fresh state
        window.location.href = '/'; 
      }, 2000);

    } catch (err: any) {
      console.error("Error deleting account:", err);
      setErrorMsg(err.message || "Er ging iets mis bij het verwijderen van de account. Probeer opnieuw.");
      setConfirmDelete(false); // Reset confirmation state on error
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
              // ⚠️ NOTE: We can remove the manual cleaning here, as the validation handles it
              setPhone(e.target.value)
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
            {loading && !confirmDelete ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
        </form>

        {/* --- ⭐ NEW: Account Deletion Section --- */}
        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#ff4d4f', marginBottom: '10px' }}>Account Verwijderen</h3>
          {confirmDelete ? (
            <>
              <p style={{ color: '#ff4d4f', fontSize: '0.9rem', marginBottom: '10px' }}>
                **Weet u zeker dat u uw account wilt verwijderen?** Al uw gegevens gaan permanent verloren.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={loading}
                style={{
                  backgroundColor: '#ff4d4f',
                  color: 'white',
                  borderColor: '#ff4d4f',
                  marginBottom: '10px',
                }}
              >
                {loading && confirmDelete ? "Verwijderen..." : "JA, Verwijder mijn account permanent"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={loading}
                style={{
                  backgroundColor: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                }}
              >
                Annuleren
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
              style={{
                backgroundColor: '#f9f9f9',
                color: '#ff4d4f',
                border: '1px solid #ff4d4f',
              }}
            >
              Account verwijderen
            </button>
          )}
        </div>
        {/* ------------------------------------------ */}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}