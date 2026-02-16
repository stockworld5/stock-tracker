"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SupportWidget from "@/components/support/SupportWidget"; // <-- added

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/sign-in");
    });
    return () => unsub();
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 px-10 py-8 relative">
        <TopBar />
        {children}

        {/* Floating Support Widget */}
        <SupportWidget />
      </main>
    </div>
  );
}
