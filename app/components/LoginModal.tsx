"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import "./loginModal.css";

export default function LoginModal({ open, onClose, onLoginSuccess }: any) {
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // 🧩 Remember current URL
  const currentUrl =
    typeof window !== "undefined" ? window.location.href : undefined;

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // 👇 after successful login, return to original page
        if (onLoginSuccess) onLoginSuccess();
        onClose();
        if (currentUrl) window.history.replaceState({}, "", currentUrl);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2 className="modal-title">Log in of maak een account</h2>
        <Auth
          supabaseClient={supabase}
          providers={["google", "facebook"]}
          redirectTo={
            typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}${window.location.search}`
            : undefined
        }
        />
      </div>
    </div>,
    document.body
  );
}
