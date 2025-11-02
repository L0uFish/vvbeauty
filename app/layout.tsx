import "./globals.css";
import { UserProvider } from "@/app/context/UserContext";
import { AuthUIProvider } from "@/app/context/AuthUIContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <UserProvider>
          <AuthUIProvider>{children}</AuthUIProvider>
        </UserProvider>
      </body>
    </html>
  );
}
