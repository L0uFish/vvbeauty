"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserContextType = {
  user: any;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Re-fetch the current user/session
  const refreshUser = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      setUser(session?.user || null);

      // ✅ Restore pending booking if one exists
      if (session?.user) {
        const pending = localStorage.getItem("pendingBooking");
        if (pending) {
          try {
            const { serviceId, selectedDate, selectedTime } = JSON.parse(pending);
            localStorage.removeItem("pendingBooking");
            window.location.href = `/plannen?service=${serviceId}&date=${selectedDate}&time=${selectedTime}`;
          } catch (e) {
            console.error("Error restoring pending booking:", e);
          }
        }
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }

        // ✅ Same restore logic on initial mount
        if (session?.user) {
          const pending = localStorage.getItem("pendingBooking");
          if (pending) {
            try {
              const { serviceId, selectedDate, selectedTime } = JSON.parse(pending);
              localStorage.removeItem("pendingBooking");
              window.location.href = `/plannen?service=${serviceId}&date=${selectedDate}&time=${selectedTime}`;
            } catch (e) {
              console.error("Error restoring pending booking:", e);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching session:", err);
        if (mounted) setLoading(false);
      }
    };

    initUser();

    // Auth state listener for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user || null);
        setLoading(false);
      }

      // ✅ Also handle restore here after OAuth redirects
      if (session?.user) {
        const pending = localStorage.getItem("pendingBooking");
        if (pending) {
          try {
            const { serviceId, selectedDate, selectedTime } = JSON.parse(pending);
            localStorage.removeItem("pendingBooking");
            window.location.href = `/plannen?service=${serviceId}&date=${selectedDate}&time=${selectedTime}`;
          } catch (e) {
            console.error("Error restoring pending booking:", e);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
