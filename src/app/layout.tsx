
import type { Metadata } from "next";
import StoreProvider from "@/shared/providers/store-provider";
import "./globals.scss";

export const metadata: Metadata = {
  title: "D4NCE",
  description: "The ultimate video dance class experience.",
  icons: {
    icon: "/app-logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
