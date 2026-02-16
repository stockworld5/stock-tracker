import "@/app/globals.css";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import SupportWidget from "@/components/support/SupportWidget";

export const metadata = {
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

        {/* Global Support Chat */}
        <SupportWidget />
      </body>
    </html>
  );
}
