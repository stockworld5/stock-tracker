import "@/app/globals.css";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import ClientSupportWidget from "./ClientSupportWidget";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StockHorizon",
  description: "Modern stock intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <EmailVerificationBanner />
        {children}
        <ClientSupportWidget />
      </body>
    </html>
  );
}
