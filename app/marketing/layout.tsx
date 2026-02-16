import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-white">
      <PublicHeader />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
