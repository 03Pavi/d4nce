
import type { Metadata, Viewport } from "next";
import StoreProvider from "@/shared/providers/store-provider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IncomingCallListener } from "@/components/incoming-call-listener";
import { OneSignalManager } from "@/components/one-signal-manager";
import Script from "next/script";
import "./globals.scss";

import ThemeProvider from "@/shared/providers/theme-provider";

export const metadata: Metadata = {
  title: "CozyTribe",
  description: "The ultimate cozy experience.",
  manifest: "/manifest.json",
  icons: {
    icon: "/cozy-logo.svg",
    apple: "/cozy-logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CozyTribe",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "CozyTribe",
    title: "CozyTribe - Cozy Experience",
    description: "The ultimate cozy experience.",
  },
  twitter: {
    card: "summary",
    title: "CozyTribe - Cozy Experience",
    description: "The ultimate cozy experience.",
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
            <IncomingCallListener />
            <OneSignalManager />
            <InstallPrompt />
            <Script 
              src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" 
              strategy="afterInteractive" 
            />
            <Script id="onesignal-init" strategy="afterInteractive">
              {`
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                OneSignalDeferred.push(async function(OneSignal) {
                  await OneSignal.init({
                    appId: "af9c3011-df39-423c-a2fa-832d24775f98",
                  });
                });
              `}
            </Script>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
