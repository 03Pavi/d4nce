
import type { Metadata, Viewport } from "next";
import StoreProvider from "@/shared/providers/store-provider";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./globals.scss";

import ThemeProvider from "@/shared/providers/theme-provider";

export const metadata: Metadata = {
  title: "D4NCE",
  description: "The ultimate video dance class experience.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.png",
    apple: "/icons/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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

export const viewport: Viewport = {
  themeColor: "#ff0055",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <StoreProvider>
          <ThemeProvider>
            {children}
            <InstallPrompt />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
