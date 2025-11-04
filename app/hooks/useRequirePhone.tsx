"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    __confirmPhone?: () => void;
  }
}

export function useRequirePhone() {
  const [showModal, setShowModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  // === CLEAN + VALIDATE BELGIAN PHONE ===
  const cleanAndValidatePhone = (raw: string): string | null => {
    console.log("📞 Raw input:", raw);
    if (!raw) return null;

    // Remove spaces and non-numeric symbols except '+'
    let cleaned = raw.replace(/\s+/g, "").replace(/[^\d+]/g, "");
    console.log("🧹 Cleaned input:", cleaned);

    // --- Normalization rules ---
    // 1. "0032468574614" → "+32468574614"
    // 2. "0468574614" → "+32468574614"
    // 3. "+32468574614" → stays the same
    if (cleaned.startsWith("00")) {
      cleaned = "+" + cleaned.slice(2);
    } else if (cleaned.startsWith("0")) {
      cleaned = "+32" + cleaned.slice(1);
    } else if (/^32\d{8}$/.test(cleaned)) {
      cleaned = "+" + cleaned;
    }

    console.log("🔹 Normalized phone:", cleaned);

    // --- Validation: must be a proper Belgian mobile ---
    // Belgian GSM = +324XXXXXXXX (total length = 12)
    const belgianRegex = /^\+324\d{8}$/;
    const valid = belgianRegex.test(cleaned);

    console.log("✅ Valid:", valid, "| Final:", cleaned);
    return valid ? cleaned : null;
  };

  // === MAIN FUNCTION ===
  const ensurePhone = async (): Promise<boolean> => {
    console.log("🚀 ensurePhone() STARTED");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.warn("⛔ No user found or error fetching user:", userError);
        return false;
      }

      const user = userData.user;
      console.log("👤 Logged in as:", user.email);

      // Fetch client profile
      const { data: profile, error: dbError } = await supabase
        .from("clients")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();

      if (dbError) {
        console.error("💥 Error fetching client profile:", dbError);
        return false;
      }

      if (!profile) {
        console.log("🆕 No client record found. Creating new...");
        const { error: insertError } = await supabase.from("clients").insert([
          {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            email: user.email,
            phone: null,
            created_at: new Date().toISOString(),
          },
        ]);

        if (insertError) {
          console.error("💥 Failed to create new client:", insertError);
          return false;
        }
      }

      if (!profile?.phone) {
        console.log("☎️ No phone number found — opening modal...");
        setShowModal(true);
      } else {
        console.log("✅ Existing phone found:", profile.phone);
        return true;
      }

      // Wait for confirmation
      return new Promise<boolean>((resolve) => {
        const confirmHandler = async () => {
          console.log("🖐 Confirm handler called with:", tempPhone);
          const cleaned = cleanAndValidatePhone(tempPhone);

          if (!cleaned) {
            alert("❌ Ongeldig telefoonnummer.\nGebruik bv. 0468574614 of +32468574614");
            console.warn("Invalid number entered:", tempPhone);
            return;
          }

          // Save to clients table
          const { error: updateError } = await supabase
            .from("clients")
            .update({ phone: cleaned })
            .eq("id", user.id);

          if (updateError) {
            alert("❌ Kon telefoonnummer niet opslaan.");
            console.error("💥 Update error:", updateError);
            return;
          }

          // Update auth metadata too (optional)
          await supabase.auth.updateUser({ data: { phone: cleaned } });

          console.log("✅ Phone saved successfully:", cleaned);
          setShowModal(false);
          resolve(true);
        };

        window.__confirmPhone = confirmHandler;
      });
    } catch (err) {
      console.error("💥 Uncaught error in ensurePhone():", err);
      return false;
    }
  };

  // === MINI MODAL ===
  const MiniPhoneModal = showModal && (
    <div className="modal-overlay mini-blocker">
      <div className="mini-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>📞 Vul je telefoonnummer in</h3>
        <p>We hebben je nummer nodig om verder te gaan.</p>
        <input
          type="tel"
          placeholder="bv. 0468 57 46 14"
          value={tempPhone}
          onChange={(e) => setTempPhone(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && window.__confirmPhone?.()}
        />
        <button className="mini-submit" onClick={() => window.__confirmPhone?.()}>
          Opslaan
        </button>
      </div>
    </div>
  );

  return { ensurePhone, MiniPhoneModal };
}
