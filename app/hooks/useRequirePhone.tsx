"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ✅ Declare global window helper so TS knows about it
declare global {
  interface Window {
    __confirmPhone?: () => void;
  }
}

export function useRequirePhone() {
  const [showModal, setShowModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  // ✅ Clean + validate Belgian phone numbers
  const cleanAndValidatePhone = (raw: string) => {
    let cleaned = raw.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    const valid = /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned);
    return valid ? cleaned : null;
  };

  // ✅ Main logic: make sure user has a phone number
  const ensurePhone = async (): Promise<boolean> => {
    console.log("📞 ensurePhone() STARTED");

    try {
      const result = await supabase.auth.getUser();
      console.log("📞 getUser() result:", result);

      const user = result.data?.user;
      if (!user) {
        console.warn("⛔ No user returned from supabase.auth.getUser()");
        return false;
      }

      console.log("📞 Checking phone for user:", user.id);

      // 1️⃣ Check phone in auth metadata
      const metaPhone = user.user_metadata?.tel || user.phone;
      if (metaPhone && cleanAndValidatePhone(metaPhone)) {
        console.log("✅ Phone found in auth metadata:", metaPhone);
        return true;
      }

      // 2️⃣ Check the `users` table
      const { data: profile, error: dbError } = await supabase
        .from("users")
        .select("tel")
        .eq("id", user.id)
        .single();

      if (dbError) {
        console.warn("⚠️ Error fetching user profile:", dbError);
      }

      if (profile?.tel && cleanAndValidatePhone(profile.tel)) {
        console.log("✅ Phone found in users table:", profile.tel);
        return true;
      }

      // 3️⃣ No valid phone → open mini modal
      setShowModal(true);

      return new Promise<boolean>((resolve) => {
        const confirmHandler = async () => {
          const cleaned = cleanAndValidatePhone(tempPhone);
          if (!cleaned) {
            alert("❌ Ongeldig telefoonnummer.");
            return;
          }

          // ✅ Save to both places
          const { error: updateError } = await supabase
            .from("users")
            .update({ tel: cleaned })
            .eq("id", user.id);

          if (updateError) {
            alert("❌ Kon telefoonnummer niet opslaan.");
            console.error(updateError);
            return;
          }

          await supabase.auth.updateUser({
            data: { tel: cleaned },
          });

          console.log("✅ Phone saved successfully:", cleaned);
          setShowModal(false);
          resolve(true);
        };

        // Make confirm handler accessible to button
        window.__confirmPhone = confirmHandler;
      });
    } catch (err) {
      console.error("💥 Error in ensurePhone():", err);
      return false;
    }
  };

  // ✅ Simple inline modal
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
        />
        <button
          className="mini-submit"
          onClick={() => window.__confirmPhone?.()}
        >
          Opslaan
        </button>
      </div>
    </div>
  );

  return { ensurePhone, MiniPhoneModal };
}
