
import type { Metadata } from "next";
import StoreProvider from "@/shared/providers/store-provider";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./globals.scss";

export const metadata: Metadata = {
  title: "D4NCE",
  description: "The ultimate video dance class experience.",
  manifest: "/manifest.json",
  icons: {
    icon: "/app-logo.svg",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "D4NCE",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "D4NCE",
    title: "D4NCE - Dance Class Platform",
    description: "The ultimate video dance class experience with live sessions, reminders, and reels",
  },
  twitter: {
    card: "summary",
    title: "D4NCE - Dance Class Platform",
    description: "The ultimate video dance class experience with live sessions, reminders, and reels",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#ff0055" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="D4NCE" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body suppressHydrationWarning={true}>
        <StoreProvider>
          {children}
          <InstallPrompt />
        </StoreProvider>
      </body>
    </html>
  );
}
