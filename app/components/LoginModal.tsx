"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/app/context/UserContext";
import "./loginModal.css";
import { cleanAndValidatePhone } from "@/app/hooks/useRequirePhone"; 

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
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { refreshUser } = useUser(); 

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  const oauth = async (provider: "google" | "facebook") => {
    const currentUrl = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: currentUrl },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    let cleanedPhone: string | null = null;

    try {
      if (isSignUp) {
        // --- Phone Number Validation and Cleaning ---
        cleanedPhone = cleanAndValidatePhone(phone);
        
        if (!cleanedPhone) {
          throw new Error("Voer een geldig Belgisch telefoonnummer in (bv. 0482 45 56 42).");
        }
        
        // --- Perform Sign Up ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone: cleanedPhone }, 
          },
        });
        
        // 1. If sign up is successful, insert the record into the 'clients' table
        if (!error) {
            // 🟢 FIX: Await the getUser() promise to access the user object
            const { data: { user } } = await supabase.auth.getUser();
            
            const { error: tableError } = await supabase.from('clients').insert({
                id: user?.id, // Use the user ID from the awaited result
                full_name: fullName,
                email: email,
                phone: cleanedPhone,
            });
            if (tableError) console.error("Error inserting client record:", tableError);
        }

        if (error) throw error;
        
      } else {
        // --- Perform Login ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      // If everything is fine, execute onLoginSuccess callback
      onLoginSuccess?.();
      await refreshUser();
      onClose();
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
                placeholder="Telefoonnummer (bv. 0482 45 56 42)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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