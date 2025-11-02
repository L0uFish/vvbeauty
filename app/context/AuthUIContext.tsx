"use client";

import { createContext, useContext, useState } from "react";
import LoginModal from "@/app/components/LoginModal";

type AuthUIContextType = {
  openLogin: () => void;
  closeLogin: () => void;
  isOpen: boolean;
};

const AuthUIContext = createContext<AuthUIContextType>({
  openLogin: () => {},
  closeLogin: () => {},
  isOpen: false,
});

export function AuthUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = () => setIsOpen(true);
  const closeLogin = () => setIsOpen(false);

  return (
    <AuthUIContext.Provider value={{ openLogin, closeLogin, isOpen }}>
      {children}
      <LoginModal
        open={isOpen}
        onClose={closeLogin}
        onLoginSuccess={closeLogin}
      />
    </AuthUIContext.Provider>
  );
}

export const useAuthUI = () => useContext(AuthUIContext);
