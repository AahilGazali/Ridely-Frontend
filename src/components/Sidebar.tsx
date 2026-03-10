"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DRIVER_LINKS = [
  { href: "/driver/dashboard", label: "Dashboard", icon: "📋" },
  { href: "/driver/history", label: "History", icon: "📜" },
  { href: "/driver/earnings", label: "Earnings", icon: "💰" },
  { href: "/driver/profile", label: "Profile", icon: "👤" },
];

interface SidebarProps {
  className?: string;
}

/**
 * Sidebar for driver dashboard - navigation links. Collapses on mobile.
 */
export function Sidebar({ className = "" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`w-56 shrink-0 border-r border-gray-200 bg-white py-4 ${className}`}
    >
      <nav className="flex flex-col gap-1 px-2">
        {DRIVER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              pathname === link.href
                ? "bg-uber-green/10 text-uber-green"
                : "text-gray-600 hover:bg-gray-100 hover:text-black"
            }`}
          >
            <span aria-hidden>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
