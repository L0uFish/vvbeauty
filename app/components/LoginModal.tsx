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
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mini modal (for OAuth + Email users missing phone)
  const [showMiniModal, setShowMiniModal] = useState(false);
  const [miniData, setMiniData] = useState({
    email: "",
    fullName: "",
    phone: "",
  });

  const currentUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : undefined;

  useEffect(() => {
    setMounted(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) return;

        try {
          await supabase.rpc("add_user_if_missing");

          const { data: userData } = await supabase
            .from("users")
            .select("email, full_name, tel")
            .eq("id", session.user.id)
            .maybeSingle();

          // If no phone number, show mini modal
          if (!userData?.tel) {
            setMiniData({
              email: userData?.email || session.user.email || "",
              fullName:
                userData?.full_name ||
                session.user.user_metadata?.full_name ||
                "",
              phone: "",
            });
            setShowMiniModal(true);
            return;
          }

          onLoginSuccess?.();
          onClose();
          if (currentUrl) window.history.replaceState({}, "", currentUrl);
        } catch (err) {
          console.error("Error ensuring user record:", err);
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (!mounted || !open) return null;

  // OAuth login
  const oauth = async (provider: "google" | "facebook") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: currentUrl },
    });
  };

  // Clean & validate Belgian number
  const cleanAndValidatePhone = (raw: string) => {
    let cleaned = raw.trim().replace(/\s+/g, "").replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
    const valid =
      /^0\d{8,9}$/.test(cleaned) || /^\+32\d{8,9}$/.test(cleaned);
    return valid ? cleaned : null;
  };

  // Email signup/login
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        if (!phone) {
          setErrorMsg("Telefoonnummer is verplicht.");
          setLoading(false);
          return;
        }

        const cleaned = cleanAndValidatePhone(phone);
        if (!cleaned) {
          setErrorMsg(
            "Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14)."
          );
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, tel: cleaned },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // ✅ check if phone missing
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("tel, email, full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (!userData?.tel) {
            setMiniData({
              email: userData?.email || user.email || "",
              fullName:
                userData?.full_name || user.user_metadata?.full_name || "",
              phone: "",
            });
            setShowMiniModal(true);
            return;
          }
        }
      }

      // If everything is fine
      onLoginSuccess?.();
      onClose();
      if (currentUrl) window.history.replaceState({}, "", currentUrl);
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "Er ging iets mis, probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  // Mini modal submit (for OAuth or Email users missing phone)
  const handleMiniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = cleanAndValidatePhone(miniData.phone);
    if (!cleaned) {
      alert(
        "Voer een geldig Belgisch telefoonnummer in (bv. 0468 57 46 14 of +32 468 57 46 14)."
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Geen actieve gebruiker gevonden.");
      return;
    }

    try {
      await supabase.from("users").update({ tel: cleaned }).eq("id", user.id);
      await supabase.rpc("add_user_if_missing");
      setShowMiniModal(false);
      onLoginSuccess?.();
      onClose();
      if (currentUrl) window.history.replaceState({}, "", currentUrl);
    } catch (err) {
      console.error("Error updating tel:", err);
      alert("Kon telefoonnummer niet opslaan.");
    }
  };

  // --- Main modal ---
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

  // --- Mini modal (missing phone) ---
  const miniModal = showMiniModal && (
    <div className="modal-overlay mini-blocker">
      <div className="mini-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Vul je gegevens aan</h3>
        <p>We missen nog je telefoonnummer om je profiel te vervolledigen.</p>
        <form onSubmit={handleMiniSubmit} className="mini-form">
          <input type="text" value={miniData.fullName} disabled />
          <input type="email" value={miniData.email} disabled />
          <input
            type="tel"
            placeholder="Telefoonnummer"
            value={miniData.phone}
            onChange={(e) =>
              setMiniData({
                ...miniData,
                phone: e.target.value
                  .replace(/[^\d+]/g, "")
                  .replace(/\s+/g, ""),
              })
            }
            required
            autoFocus
          />
          <button type="submit" className="mini-submit">
            Opslaan
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(
    <>
      {modalContent}
      {miniModal}
    </>,
    document.body
  );
}
