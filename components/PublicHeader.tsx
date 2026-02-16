"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import NavItems from "@/components/ui/NavItems";

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? "bg-blue-900/70 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
          : "bg-transparent"}
      `}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Stock<span className="text-blue-300">Horizon</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:block">
          <NavItems />
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Sign in
          </Link>

          <Link href="/dashboard">
            <Button className="h-9 rounded-full bg-white text-blue-700 hover:bg-white/90 px-5 font-semibold">
              Dashboard Login
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
