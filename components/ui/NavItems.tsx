'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/clients", label: "Clients" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export default function NavItems() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <ul className="flex items-center gap-10 font-medium">
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href);

        return (
          <li key={item.href} className="relative">
            <Link
              href={item.href}
              className={`text-sm transition-colors ${
                active ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {item.label}

              {/* underline indicator */}
              <span
                className={`absolute left-0 -bottom-[6px] h-[2px] w-full rounded-full transition-all duration-300 ${
                  active ? "bg-white opacity-100" : "opacity-0"
                }`}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
