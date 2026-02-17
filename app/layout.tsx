"use client";

import "@/app/globals.css";
import SupportWidget from "@/components/support/SupportWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">

        {/* page content */}
        {children}

        {/* 🔥 SUPPORT — GLOBAL FLOATING CHAT */}
        <SupportWidget />
      </body>
    </html>
  );
}
