"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import AnimatedBackground from "./AnimatedBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isImmersiveRoute = pathname === "/sign-up";
  const isWideRoute = pathname === "/sign-in";

  if (isImmersiveRoute) {
    return (
      <main className="relative min-h-[100svh] w-full overflow-x-clip">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.995 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[100svh]"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      
      {/* Background */}
      <AnimatedBackground />

      {/* Container now dynamic */}
      <section
        className={`relative z-10 w-full px-6 ${
          isWideRoute ? "max-w-7xl" : "max-w-md"
        }`}
      >
        
        {/* Logo */}
        <Link
          href="/"
          className="absolute -top-12 left-1/2 -translate-x-1/2 text-blue-600 font-semibold tracking-wide"
        >
          StockHorizon
        </Link>

        {/* Page transition animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-400">
          <div className="mb-2 flex justify-center gap-4">
            <Link href="#">Help</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Privacy</Link>
          </div>
          © 2026 StockHorizon
        </footer>
      </section>
    </main>
  );
}
