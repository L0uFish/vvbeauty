import "./globals.css";
import { UserProvider } from "@/app/context/UserContext";
import { AuthUIProvider } from "@/app/context/AuthUIContext";

export const metadata = {
  title: "VVBeauty",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", rel: "shortcut icon" },
      { url: "/apple-touch-icon.png", sizes: "180x180", rel: "apple-touch-icon" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  other: {
    "apple-mobile-web-app-title": "VVBeauty",
  },
};
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
