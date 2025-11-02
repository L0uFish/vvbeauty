"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "../context/UserContext";
import LoginModal from "./LoginModal";
import "../styles/Header.css";

export default function Header() {
  const { user, loading, refreshUser } = useUser();
  const [openLogin, setOpenLogin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Clear user state immediately
        await refreshUser();

        // Optional hard reload fallback (guaranteed visual update)
        window.location.reload();
    } catch (err) {
        console.error("Logout error:", err);
    }
    };

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="top-header">
        {!loading && (
          <>
            {!user ? (
              <button
                className="login-button"
                type="button"
                onClick={() => setOpenLogin(true)}
              >
                Inloggen
              </button>
            ) : (
              <div className="user-menu-wrapper" ref={dropdownRef}>
                <button
                  className="user-toggle"
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  <span className="user-initial">
                    {user.user_metadata?.full_name
                      ? user.user_metadata.full_name.charAt(0).toUpperCase()
                      : user.email?.charAt(0).toUpperCase()}
                  </span>
                  <span className="user-name">
                    {user.user_metadata?.full_name ||
                      user.email?.split("@")[0]}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    className={`chevron ${dropdownOpen ? "open" : ""}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="user-dropdown">
                    <a href="/profiel">Mijn gegevens</a>
                    <a href="/afspraken">Mijn afspraken</a>
                    <button
                      className="logout-option"
                      type="button"
                      onClick={handleLogout}
                    >
                      Uitloggen
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </header>

      <LoginModal
        open={openLogin}
        onClose={() => setOpenLogin(false)}
        onLoginSuccess={() => setOpenLogin(false)}
      />
    </>
  );
}
