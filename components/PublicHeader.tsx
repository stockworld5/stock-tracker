"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import NavItems from "@/components/ui/NavItems";

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header
      className={`
        fixed left-0 right-0 top-8 z-50 transition-all duration-300
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
            href="/sign-up"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Sign up
          </Link>

          <Link href="/sign-in">
            <Button className="h-9 rounded-full bg-white text-blue-700 hover:bg-white/90 px-5 font-semibold">
              Dashboard Login
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
