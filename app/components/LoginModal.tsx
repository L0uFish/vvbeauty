"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // Ensure this import
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/app/context/UserContext";
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
  const [mounted, setMounted] = useState(false); // Track if component is mounted on the client
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { refreshUser } = useUser();  // Access refreshUser to update user state

  // This effect ensures that we set the `mounted` state to true once the component is mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🛑 THE FIX IS HERE 🛑
  // Only render the modal if it's mounted on the client AND the 'open' prop is true.
  if (!mounted || !open) return null;

  const oauth = async (provider: "google" | "facebook") => {
    const currentUrl = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: currentUrl },  // Set redirectTo to the current URL
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);


    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, tel: phone }, // Assume phone is optional for sign up
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

      }

      // If everything is fine, execute onLoginSuccess callback
      onLoginSuccess?.();
      await refreshUser();  // Refresh user state
      onClose();  // Close the modal
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "Er ging iets mis, probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <h2 className="modal-title">Log in of maak een account</h2>

        <div className="socials">
          <button
            className="social-btn social-google"
            onClick={() => oauth("google")}
            disabled={loading}
          >
            <span className="social-icon google" />
            <span>Sign in with Google</span>
          </button>
          <button
            className="social-btn social-facebook"
            onClick={() => oauth("facebook")}
            disabled={loading}
          >
            <span className="social-icon facebook" />
            <span>Sign in with Facebook</span>
          </button>
        </div>

        <div className="divider">
          <span>of</span>
        </div>

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
                placeholder="Telefoonnummer"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(/[^\d+]/g, "").replace(/\s+/g, "")
                  )
                }
                required
                title="Voer een geldig telefoonnummer in"
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
