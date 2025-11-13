"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ============================================================
   PHONE NORMALIZATION + VALIDATION
   ============================================================ */

export const cleanAndValidatePhone = (raw: string): string | null => {
  if (!raw) return null;

  raw = raw.trim();
  if (!raw) return null;

  let cleaned = raw.replace(/\s+/g, "").replace(/[^0-9+]/g, "");

  if (cleaned.startsWith("0032")) cleaned = "0" + cleaned.slice(4);
  else if (cleaned.startsWith("+32")) cleaned = "0" + cleaned.slice(3);
  else if (cleaned.startsWith("32") && !cleaned.startsWith("+"))
    cleaned = "0" + cleaned.slice(2);

  const localRegex = /^0\d{8,9}$/;
  return localRegex.test(cleaned) ? cleaned : null;
};

/* ============================================================
   useRequirePhone (Optimized = NO performance violations)
   ============================================================ */

export function useRequirePhone() {
  const [showModal, setShowModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);

  // For resolving callers of ensurePhone()
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  /* ------------------------------------------------------------
     🔥 PERFORMANCE FIX: Validate phone *passively* in useEffect
       → Runs only once on mount
       → Does NOT block click/navigation handlers
       → Eliminates "Violation" warnings completely
     ------------------------------------------------------------ */

  useEffect(() => {
    let active = true;

    async function checkPhone() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (active) setHasPhone(false);
        return;
      }

      const { data: profile } = await supabase
        .from("clients")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (!profile) {
        // Auto-create empty profile
        await supabase.from("clients").insert([
          {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            email: user.email,
            phone: null,
            created_at: new Date().toISOString(),
          },
        ]);

        setHasPhone(false);
        setShowModal(true);
        return;
      }

      if (!profile.phone) {
        setHasPhone(false);
        setShowModal(true);
        return;
      }

      setHasPhone(true);
    }

    checkPhone();
    return () => {
      active = false;
    };
  }, []);

  /* ------------------------------------------------------------
     CONFIRM HANDLER — saves phone
     ------------------------------------------------------------ */

  const confirmHandler = async () => {
    const cleaned = cleanAndValidatePhone(tempPhone);

    if (!cleaned) {
      alert("❌ Ongeldig telefoonnummer.");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    await supabase.from("clients").update({ phone: cleaned }).eq("id", user.id);
    await supabase.auth.updateUser({ data: { phone: cleaned } });

    setShowModal(false);
    setHasPhone(true);

    resolveRef.current?.(true);
  };

  /* ------------------------------------------------------------
     ensurePhone()
     → Now simply checks cached state
     → Instant, non-blocking
     → ZERO performance impact
     ------------------------------------------------------------ */

  const ensurePhone = async (): Promise<boolean> => {
    if (hasPhone === true) return true;

    // If phone unknown or missing, open modal
    setShowModal(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  /* ------------------------------------------------------------
     Mini Modal
     ------------------------------------------------------------ */

  const MiniPhoneModal =
    showModal && (
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
