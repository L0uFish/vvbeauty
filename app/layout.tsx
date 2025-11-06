import "./globals.css";
import { UserProvider } from "@/app/context/UserContext";
import { AuthUIProvider } from "@/app/context/AuthUIContext";

export const metadata = {
  metadataBase: new URL("https://vvbeauty.vercel.app"),
  title: "VVBeauty | Nails & Lashes",
  description: "Nagel- en wimperstudio in hartje België. Boek je afspraak eenvoudig online bij VVBeauty.",
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
  "apple-mobile-web-app-capable": "yes",
  "apple-mobile-web-app-status-bar-style": "white",
  "apple-mobile-web-app-title": "VVBeauty",
  },
  openGraph: {
    title: "VVBeauty | Nails & Lashes",
    description: "Ontdek onze nagel- en wimperbehandelingen — stijlvol, professioneel en met oog voor detail.",
    url: "https://vvbeauty.vercel.app",
    siteName: "VVBeauty",
    images: [
      { url: "/og-image.jpg", width: 1200, height: 630, alt: "VVBeauty salon preview" },
    ],
    locale: "nl_BE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VVBeauty | Nails & Lashes",
    description: "Boek je afspraak online en ontdek onze stijlvolle nagel- en wimperbehandelingen.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://vvbeauty.vercel.app",
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
