"use client";

import { useState, useRef } from "react"; // 🟢 Import useRef
import { supabase } from "@/lib/supabaseClient";

// We no longer need the global declaration for __confirmPhone
// declare global {
//   interface Window {
//     __confirmPhone?: () => void;
//   }
// }

// === CLEAN + VALIDATE BELGIAN PHONE (EXPORTED) ===
/**
 * Normalizes all valid Belgian numbers (+32 / 0032 / 0 prefix) 
 * to a 9 or 10-digit local format starting with '0' (e.g., "0482455642").
 */
export const cleanAndValidatePhone = (raw: string): string | null => {
  // 🟢 DEBUG 1: What raw input is received?
  console.log("📞 [Validator] Raw input received:", raw);
  
  // 1. **CRITICAL FIX**: Trim whitespace immediately
  raw = raw.trim(); 
  
  if (!raw) {
      console.log("⛔ [Validator] Input is empty after trimming.");
      return null;
  }
  
  // 2. Remove all spaces, dashes, and non-numeric characters except '+'
  let cleaned = raw.replace(/\s/g, "").replace(/[^0-9+]/g, "");
  console.log("🧹 [Validator] Cleaned input (numeric/plus only):", cleaned);

  // --- Normalization to Local "0..." format ---
  if (cleaned.startsWith("0032")) {
    // "0032" prefix -> "0"
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("+32")) {
    // "+32" prefix -> "0"
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("32") && cleaned.length >= 10 && !cleaned.startsWith('+')) {
    // "32" prefix (without '+') -> "0"
    cleaned = "0" + cleaned.slice(2);
  }
  // If it starts with '0' already, it remains as is.
  console.log("🔹 [Validator] Normalized to Local '0...' format:", cleaned);

  // --- Validation (Must be a 9 or 10-digit number starting with '0') ---
  const localRegex = /^0\d{8,9}$/; 
  const valid = localRegex.test(cleaned);

  if (!valid) {
    console.log(`⛔ [Validator] Validation failed. Resulting number: ${cleaned}. Regex: ${localRegex}`);
    return null;
  }
  
  // 🟢 DEBUG 2: Final successful result
  console.log("✅ [Validator] Validation successful. Final number:", cleaned);
  return cleaned;
};

// === HOOK START ===
export function useRequirePhone() {
  const [showModal, setShowModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  
  // 🟢 Use ref to hold the promise resolver for stable access
  const resolveRef = useRef<((value: boolean) => void) | null>(null); 
  
  // 🟢 Handler function (stable, can read latest state)
  const confirmHandler = async () => {
    // 🟢 DEBUG 3: What is the state value right before validation?
    console.log("🖐 Confirm handler called with state value (tempPhone):", `"${tempPhone}"`); 

    const cleaned = cleanAndValidatePhone(tempPhone);

    if (!cleaned) {
      alert("❌ Ongeldig telefoonnummer.\nVoer een geldig Belgisch nummer in (bv. 0482 45 56 42).");
      console.warn("Invalid number entered:", tempPhone);
      return;
    }

    // --- Save Logic (Need to re-fetch user info, as it's not a dependency) ---
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
        resolveRef.current?.(false);
        setShowModal(false);
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
    
    // 🟢 Resolve the promise and continue the booking flow
    resolveRef.current?.(true); 
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

      // Create new client record if it doesn't exist
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
        
        // 🟢 Return a new promise and capture its resolver
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve; 
        });
      } else {
        console.log("✅ Existing phone found:", profile.phone);
        return true;
      }

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
          placeholder="bv. 0482 45 56 42"
          value={tempPhone}
          onChange={(e) => setTempPhone(e.target.value)}
          autoFocus
          // 🟢 Call the stable handler directly
          onKeyDown={(e) => e.key === "Enter" && confirmHandler()}
        />
        <button className="mini-submit" onClick={confirmHandler}>
          Opslaan
        </button>
      </div>
    </div>
  );

  return { ensurePhone, MiniPhoneModal };
}