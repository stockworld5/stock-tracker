"use client";

import "@/app/globals.css";
import SupportWidget from "@/components/support/SupportWidget";
import BetaGate from "@/components/BetaGate";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">

        {/* 🚧 BETA / TERMS GATE */}
        <BetaGate />

        {/* page content */}
        {children}

        {/* 🔥 SUPPORT — GLOBAL FLOATING CHAT */}
        <SupportWidget />

        {/* ⚡ VERCEL ANALYTICS */}
        <Analytics />

        {/* ⚡ VERCEL SPEED INSIGHTS */}
        <SpeedInsights />

      </body>
    </html>
  );
}