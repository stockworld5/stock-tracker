"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Star, LifeBuoy, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const nav = [
  { name: "Dashboard", href: "/stocks", icon: LayoutDashboard },
  { name: "Watchlist", href: "/watchlist", icon: Star },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/help", icon: LifeBuoy },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-600 to-blue-700 text-white p-6">
      <h1 className="mb-10 text-xl font-semibold">StockHorizon</h1>

      <nav className="space-y-1">
        {nav.map(({ href, name, icon: Icon }) => {
          const active = path.startsWith(href);

          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 6 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2 text-sm",
                  active
                    ? "bg-white/20 shadow-inner"
                    : "hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                {name}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}