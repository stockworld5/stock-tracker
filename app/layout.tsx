import "@/app/globals.css";
import DeferredSupportWidget from "@/components/support/DeferredSupportWidget";
import BetaGate from "@/components/BetaGate";
import AnnouncementBar from "@/components/AnnouncementBar";
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

        {/* 🔔 GLOBAL ANNOUNCEMENT BAR */}
        <AnnouncementBar />

        {/* page content */}
        {children}

        {/* 🔥 SUPPORT — GLOBAL FLOATING CHAT */}
        <DeferredSupportWidget />

        {/* ⚡ VERCEL ANALYTICS */}
        <Analytics />

        {/* ⚡ VERCEL SPEED INSIGHTS */}
        <SpeedInsights />

      </body>
    </html>
  );
}
