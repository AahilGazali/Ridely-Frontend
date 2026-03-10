"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";

const RIDER_LINKS = [
  { href: "/rider/dashboard", label: "Rides" },
  { href: "/rider/history", label: "History" },
  { href: "/rider/payment", label: "Payment" },
  { href: "/rider/profile", label: "Profile" },
];

const DRIVER_LINKS = [
  { href: "/driver/dashboard", label: "Dashboard" },
  { href: "/driver/history", label: "History" },
  { href: "/driver/earnings", label: "Earnings" },
  { href: "/driver/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const isRider = pathname.startsWith("/rider");
  const links = isRider ? RIDER_LINKS : DRIVER_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={isRider ? "/rider/dashboard" : "/driver/dashboard"}
          className="shrink-0 text-lg font-bold tracking-tight text-gray-900 sm:text-xl"
        >
          Ridely
        </Link>

        {/* Rider | Driver switcher - always visible so you can switch sides */}
        <div className="flex shrink-0 rounded-xl bg-gray-100 p-1">
          <Link
            href="/rider/dashboard"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              isRider
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Rider
          </Link>
          <Link
            href="/driver/dashboard"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              !isRider
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Driver
          </Link>
        </div>

        <nav className="hidden flex-1 justify-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-uber-green/10 text-uber-green-dark"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <RealtimeIndicator />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
