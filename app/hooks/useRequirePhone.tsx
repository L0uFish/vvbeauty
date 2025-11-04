"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Declare global window helper so TypeScript knows about it
declare global {
  interface Window {
    __confirmPhone?: () => void;
  }
}

export function useRequirePhone() {
  const [showModal, setShowModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  // Clean and validate Belgian phone numbers with length restriction (8 to 15 characters)
  const cleanAndValidatePhone = (raw: string) => {
    let cleaned = raw.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);

    // Ensure the phone number length is between 8 and 15 characters
    return cleaned.length >= 8 && cleaned.length <= 15 ? cleaned : null;
  };

  // Check if the user has a phone number, if not prompt to add one
  const ensurePhone = async (): Promise<boolean> => {
    console.log("📞 ensurePhone() STARTED");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData) {
        console.warn("⛔ No user found or error fetching user.");
        return false;
      }

      const user = userData.user;

      // Step 1: Check if the user exists in the `clients` table
      const { data: profile, error: dbError } = await supabase
        .from("clients")
        .select("tel")
        .eq("id", user.id)
        .single();

      if (dbError && dbError.code === 'PGRST100') {
        // User doesn't exist, create them in the `clients` table
        console.log("❌ User not found in clients table, creating new user...");
        const { error: insertError } = await supabase
          .from("clients")
          .insert([
            {
              id: user.id,
              full_name: user.user_metadata?.full_name || userData.user.email, // Fallback to email if no name
              email: user.email,
              created_at: new Date().toISOString(),
              tel: null, // Phone is null initially
            },
          ]);

        if (insertError) {
          console.warn("⚠️ Error inserting user into clients table:", insertError);
          return false;
        }

        console.log("✅ New user created in clients table");
      }

      // Step 2: If no phone number, show the modal to prompt for the phone number
      if (!profile?.tel) {
        setShowModal(true);
      } else {
        return true;
      }

      // Step 3: Phone number prompting logic
      return new Promise<boolean>((resolve) => {
        const confirmHandler = async () => {
          const cleaned = cleanAndValidatePhone(tempPhone);
          if (!cleaned) {
            alert("❌ Ongeldig telefoonnummer.");
            return;
          }

          // Save the phone number to the `clients` table
          const { error: updateError } = await supabase
            .from("clients")
            .update({ tel: cleaned })
            .eq("id", user.id);

          if (updateError) {
            alert("❌ Kon telefoonnummer niet opslaan.");
            console.error(updateError);
            return;
          }

          // Optionally update the phone number in the `auth.users` table as well
          await supabase.auth.updateUser({
            data: { phone: cleaned },
          });

          console.log("✅ Phone saved successfully:", cleaned);
          setShowModal(false);
          resolve(true);
        };

        // Make confirm handler accessible to the button
        window.__confirmPhone = confirmHandler;
      });
    } catch (err) {
      console.error("💥 Error in ensurePhone():", err);
      return false;
    }
  };

  // Inline modal to prompt for phone number
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
        <button className="mini-submit" onClick={() => window.__confirmPhone?.()}>
          Opslaan
        </button>
      </div>
    </div>
  );

  return { ensurePhone, MiniPhoneModal };
}
