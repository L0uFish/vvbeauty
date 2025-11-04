"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoginModal from "./LoginModal"; // Import the LoginModal component
import "../styles/Header.css";

export default function LoginBtn() {
  const [user, setUser] = useState<any>(null); // Directly manage user state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // State to control LoginModal visibility
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user session on mount and restore the session
  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        return;
      }

      if (session) {
        setUser(session.user); // Set user from session
      } else {
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null); // Update user on session change
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe(); // Correct way to unsubscribe
    };
  }, []);

  // Handle opening the LoginModal
  const handleLoginClick = () => {
    setIsLoginModalOpen(true); // Show the LoginModal when the "Log In" button is clicked
  };

  // Handle closing the LoginModal
  const handleModalClose = () => {
    setIsLoginModalOpen(false); // Close the modal
  };

  const handleLogout = async () => {

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null); // Clear user state on logout
      setDropdownOpen(false);
    } catch (err) {
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="top-header">
      {!user ? (
        <>
          <button className="login-button" type="button" onClick={handleLoginClick}>
            Inloggen
          </button>
        </>
      ) : (
        <div className="user-menu-wrapper" ref={dropdownRef}>
          <button
            className="user-toggle"
            type="button"
            onClick={() => {
              setDropdownOpen((prev) => !prev);
            }}
          >
            <span className="user-initial">
              {user.user_metadata?.full_name
                ? user.user_metadata.full_name.charAt(0).toUpperCase()
                : user.email?.charAt(0).toUpperCase()}
            </span>
            <span className="user-name">
              {user.user_metadata?.full_name || user.email?.split("@")[0]}
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
              <a href="/profile">Mijn gegevens</a>
              <button className="logout-option" type="button" onClick={handleLogout}>
                Uitloggen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conditionally render LoginModal only when isLoginModalOpen is true */}
      <LoginModal
        open={isLoginModalOpen}
        onClose={handleModalClose}
        onLoginSuccess={() => {
          setIsLoginModalOpen(false); // Close modal after successful login
        }}
      />
    </header>
  );
}
