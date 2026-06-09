import type { Metadata, Viewport } from "next";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ogImageUrl = `${appUrl}/brand/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "KFA — Kallistis Fight Academy",
  description: "QR check-in for KFA members · Muay Thai · Kids · Private",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KFA",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    siteName: "Kallistis Fight Academy",
    title: "KFA — Kallistis Fight Academy",
    description: "QR check-in for KFA members · Muay Thai · Kids · Private",
    url: appUrl,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Kallistis Fight Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KFA — Kallistis Fight Academy",
    description: "QR check-in for KFA members · Muay Thai · Kids · Private",
    images: [ogImageUrl],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="mx-auto max-w-2xl px-4 py-6 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
