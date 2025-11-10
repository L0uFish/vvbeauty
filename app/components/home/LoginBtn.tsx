"use client";

import { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { supabase } from "@/lib/supabaseClient";
import LoginModal from "../modals/LoginModal";
import "../../styles/home/loginbtn.css";

// Define a more specific type for the user, including the role data
interface AppUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    [key: string]: any;
  };
  // Include other relevant Supabase User properties if needed
}

export default function LoginBtn() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<string | null>(null); // New state for the user's role
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- New Function: Fetch User Role from Database ---
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      // Assuming your client/profile table is named 'clients' and the user ID column is 'id'
      const { data, error } = await supabase
        .from("clients")
        .select("role")
        .eq("id", userId) // Match the Supabase User ID
        .single(); // Expecting one row

      if (error && error.code !== 'PGRST116') { // Ignore "No rows found" error on first login/profile creation
        throw error;
      }
      
      // Set the role state, defaulting to 'client' if no role is found (or on error)
      setRole(data?.role || "client"); 
    } catch (err) {
      console.error("Error fetching user role:", err);
      setRole("client"); // Default to client on failure
    }
  }, []);

  // Fetch user session on mount and restore the session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user as AppUser);
        fetchUserRole(session.user.id); // Fetch role for the initial session
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = (session?.user as AppUser) || null;
      setUser(newUser); // Update user on session change

      if (newUser) {
        fetchUserRole(newUser.id); // Fetch role when user logs in/session changes
      } else {
        setRole(null); // Clear role on logout
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserRole]); // Dependency array includes fetchUserRole

  // Handle opening the LoginModal
  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  // Handle closing the LoginModal
  const handleModalClose = () => {
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setRole(null); // Clear role on logout
      setDropdownOpen(false);
    } catch (err) {
      console.error("Logout Error:", err);
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

  // Update onLoginSuccess to also fetch the role immediately after successful login
  const handleLoginSuccess = useCallback(() => {
    setIsLoginModalOpen(false);
    // After login, the onAuthStateChange listener will eventually fire and update user/role.
    // For immediate update, we can also trigger a check if we need to.
    // However, since onAuthStateChange is already listening, we'll rely on it.
    // If the modal handles the session update internally, the useEffect listener takes care of the rest.
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
              {/* --- Admin Panel Link Conditional Rendering --- */}
              {role === "admin" && (
                <a href="/admin">AdminPanel</a>
              )}
              {/* ------------------------------------------- */}
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
        onLoginSuccess={handleLoginSuccess}
      />
    </header>
  );
}