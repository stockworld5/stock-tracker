"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StockCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={cn(
        "group relative rounded-2xl overflow-hidden p-6",
        "border border-blue-300/40",
        // 🔵 MATCHED TO SIDEBAR FAMILY
        "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800",
        "shadow-[0_15px_50px_rgba(37,99,235,0.25)]",
        "transition-all duration-300 will-change-transform",
        className
      )}
    >
      {/* 🌊 Animated gradient drift */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage: `
            linear-gradient(
              120deg,
              rgba(255,255,255,0.18),
              rgba(255,255,255,0.08),
              rgba(255,255,255,0.15)
            )
          `,
          backgroundSize: "200% 200%",
        }}
      />

      {/* ✨ Glass glow overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] pointer-events-none" />

      {/* 🧠 Tech grid */}
      <div className="absolute inset-0 bg-hero-grid opacity-[0.05] pointer-events-none" />

      {/* ⚡ Subtle light sweep */}
      <motion.div
        className="absolute inset-y-0 left-[-40%] w-[60%] bg-gradient-to-r 
                   from-transparent via-white/20 to-transparent blur-2xl"
        animate={{ x: ["0%", "180%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* 💎 Hover glow ring */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 
                   group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: "0 0 60px rgba(59,130,246,0.45)",
        }}
      />

      {title && (
        <h3 className="relative z-10 mb-4 text-lg font-semibold text-white tracking-wide">
          {title}
        </h3>
      )}

      <div className="relative z-10 text-white/95">
        {children}
      </div>
    </motion.div>
  );
}
