"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import "./loginModal.css";

export default function LoginModal({
  open,
  onClose,
  onLoginSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");  // ✅ new
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : undefined;

  useEffect(() => {
    setMounted(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          try {
            const { error: rpcError } = await supabase.rpc("add_user_if_missing");
            if (rpcError) console.error("RPC error:", rpcError);

            onLoginSuccess?.();
            onClose();
            if (currentUrl) window.history.replaceState({}, "", currentUrl);
          } catch (err) {
            console.error("Error ensuring user record:", err);
          }
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (!mounted || !open) return null;

  const oauth = async (provider: "google" | "facebook") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: currentUrl },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        // ✅ include both name & phone
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone_number: phone || null } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title">Log in of maak een account</h2>

        <div className="socials">
          <button className="social-btn social-google" onClick={() => oauth("google")} disabled={loading}>
            <span className="social-icon google" />
            <span>Sign in with Google</span>
          </button>
          <button className="social-btn social-facebook" onClick={() => oauth("facebook")} disabled={loading}>
            <span className="social-icon facebook" />
            <span>Sign in with Facebook</span>
          </button>
        </div>

        <div className="divider"><span>or</span></div>

        <form className="email-form" onSubmit={handleEmailAuth}>
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="Volledige naam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input
                type="tel"
                placeholder="Telefoonnummer (optioneel)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </>
          )}

          <input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && <p className="error-message">{errorMsg}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? "Even geduld..."
              : isSignUp
              ? "Account aanmaken"
              : "Inloggen"}
          </button>
        </form>

        <p className="toggle-mode">
          {isSignUp ? "Al een account?" : "Nog geen account?"}{" "}
          <span onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Log in" : "Registreer"}
          </span>
        </p>
      </div>
    </div>,
    document.body
  );
}
