"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface LandingHeroProps {
  isSignedIn: boolean;
}

const RIDE_OPTIONS = [
  { id: "bike", icon: "🛵", name: "Bike", tagline: "Zip through traffic at affordable fares", eta: "2 min" },
  { id: "mini", icon: "🚗", name: "Mini", tagline: "Comfy hatchbacks at pocket-friendly fares", eta: "3 min" },
  { id: "sedan", icon: "🚙", name: "Sedan", tagline: "Sedans with top-rated drivers", eta: "4 min" },
  { id: "auto", icon: "🛺", name: "Auto", tagline: "Get an auto at your doorstep", eta: "2 min" },
];

// Optional hero image: add public/hero-vehicle.png (or .jpg/.webp) to show your own vehicle.
// Get free images from: Unsplash (unsplash.com/s/photos/car-ride), Pexels (pexels.com/search/taxi), or Pixabay (pixabay.com/images/search/car).
const HERO_IMAGE_PATH = "/assets/icons/hero-vehicle.png";

export function LandingHero({ isSignedIn }: LandingHeroProps) {
  const bookHref = isSignedIn ? "/rider/dashboard" : "/sign-in";
  const driveHref = isSignedIn ? "/driver/dashboard" : "/sign-up";
  const [heroImageError, setHeroImageError] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel - White / content (Ola-style) */}
      <div className="relative z-20 flex w-full flex-col bg-white lg:w-[48%] lg:min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-gray-900">Ridely</span>
              <span className="text-2xl font-bold text-[#00d68f]">.</span>
            </Link>
            <nav className="hidden gap-6 sm:flex">
              <span className="border-b-2 border-[#00d68f] pb-1 text-sm font-semibold text-gray-900">
                Daily Rides
              </span>
              <Link href={driveHref} className="pb-1 text-sm font-medium text-gray-500 hover:text-gray-900">
                Drive & Earn
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/sign-in"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/sign-in";
              }}
              className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              Log in
            </a>
            <a
              href="/sign-up"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/sign-up";
              }}
              className="cursor-pointer rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Sign up
            </a>
          </div>
        </header>

        {/* Booking widget + content */}
        <main className="flex min-h-0 flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-sm sm:p-6">
            <div className="border-b border-gray-200 pb-3">
              <span className="border-b-2 border-[#00d68f] pb-2 text-sm font-semibold text-gray-900">Daily rides</span>
            </div>
            <Link href={bookHref} className="mt-4 block space-y-1">
              <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-[#00d68f]/50 hover:bg-gray-50">
                <span className="h-3 w-3 shrink-0 rounded-full bg-[#00d68f]" />
                <span className="flex-1 text-sm text-gray-500">Pick-up location</span>
                <span className="text-xs text-gray-400">Tap to set</span>
              </div>
              <div className="ml-2 h-3 w-px bg-gray-200" />
              <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-[#00d68f]/50 hover:bg-gray-50">
                <span className="h-3 w-3 shrink-0 rounded-full bg-amber-500" />
                <span className="flex-1 text-sm text-gray-500">Drop location</span>
                <span className="text-xs text-gray-400">Tap to set</span>
              </div>
            </Link>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                href={bookHref}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition hover:border-[#00d68f]/50 hover:bg-gray-50"
              >
                <span>When:</span>
                <span className="font-medium text-gray-900">Now</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <Link
                href={bookHref}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00d68f] py-3.5 font-semibold text-black transition hover:bg-[#00b377] sm:flex-initial sm:px-8"
              >
                Search rides
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Available rides - Ola-style list */}
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Available rides
            </h2>
            <ul className="mt-3 space-y-1">
              {RIDE_OPTIONS.map((ride, i) => (
                <li key={ride.id}>
                  <Link
                    href={bookHref}
                    className="flex items-center gap-4 rounded-xl border border-transparent px-4 py-3 transition hover:border-gray-200 hover:bg-gray-50"
                  >
                    <span className="text-2xl" aria-hidden>{ride.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{ride.name}</p>
                      <p className="truncate text-sm text-gray-500">{ride.tagline}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-400">{ride.eta}</span>
                    <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            {!isSignedIn && (
              <p className="mt-4 text-sm text-gray-500">
                Log in to see exact prices and book.
              </p>
            )}
          </section>

          {/* Footer on left panel */}
          <footer className="mt-auto border-t border-gray-100 pt-6">
            <p className="text-center text-xs text-gray-400">
              Ride · Drive · Earn — Ridely
            </p>
          </footer>
        </main>
      </div>

      {/* Right panel - Dark hero with overlay (Ola-style) */}
      <div className="relative flex min-h-[42vh] w-full flex-col justify-end overflow-hidden bg-[#1a1d1f] lg:min-h-screen lg:w-[52%]">
        {/* Gradient + visual */}
        {!heroImageError ? (
          <div className="absolute inset-0">
            <Image
              src={HERO_IMAGE_PATH}
              alt=""
              fill
              className="object-cover object-center"
              onError={() => setHeroImageError(true)}
              priority
              sizes="52vw"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 400 220" className="h-full w-full max-w-xl object-contain opacity-90" fill="none" aria-hidden>
              <path d="M0 195 L400 195" stroke="rgba(255,255,255,0.15)" strokeWidth="20" strokeLinecap="round" />
              <path d="M60 155 L95 105 L185 98 L275 105 L310 155 L310 172 L60 172 Z" fill="#fff" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
              <path d="M105 105 L175 100 L265 105 L295 152 L105 152 Z" fill="rgba(0,214,143,0.35)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <circle cx="115" cy="172" r="16" fill="#1a1d1f" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
              <circle cx="285" cy="172" r="16" fill="#1a1d1f" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
              <rect x="0" y="175" width="70" height="45" fill="rgba(255,255,255,0.06)" />
              <rect x="80" y="160" width="55" height="60" fill="rgba(255,255,255,0.07)" />
              <rect x="145" y="168" width="70" height="52" fill="rgba(255,255,255,0.05)" />
              <rect x="225" y="162" width="60" height="58" fill="rgba(255,255,255,0.07)" />
              <rect x="295" y="170" width="65" height="50" fill="rgba(255,255,255,0.06)" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1412]/50 via-[#1a1d1f]/40 to-[#0d1210]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_40%,rgba(0,214,143,0.18),transparent)]" />
        {/* Abstract “road” / car silhouette feel with shapes */}
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#1a1d1f]/90 to-transparent" />
        {/* Overlay content */}
        <div className="relative z-10 px-6 pb-16 pt-12 sm:px-10 sm:pb-20 sm:pt-16 lg:px-14 lg:pb-24 lg:pt-20">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              Everyday city commute
            </h2>
            <p className="mt-4 text-lg text-gray-300 sm:text-xl">
              Affordable cab rides at your doorstep. Book in minutes.
            </p>
            <p className="mt-6 inline-block text-sm font-semibold text-[#00d68f]">
              #RidelyForWeb
            </p>
          </div>
        </div>

        {/* Hero: prominent vehicle (car) so it’s clearly visible. To use your own image: add public/hero-vehicle.png and use <img src="/hero-vehicle.png" alt="Ride" className="..." /> here. */}
      </div>
    </div>
  );
}
