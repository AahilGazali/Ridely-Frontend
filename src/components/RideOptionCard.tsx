"use client";

import type { RideType } from "@/types";

const RIDE_LABELS: Record<RideType, string> = {
  bike: "Bike",
  mini: "Mini",
  sedan: "Sedan",
  auto: "Auto",
};

const RIDE_EMOJI: Record<RideType, string> = {
  bike: "🛵",
  mini: "🚗",
  sedan: "🚙",
  auto: "🛺",
};

interface RideOptionCardProps {
  rideType: RideType;
  selected: boolean;
  onSelect: () => void;
  priceRange?: string;
  eta?: string;
}

/**
 * Single ride type option (Bike / Mini / Sedan / Auto) for the booking panel.
 */
export function RideOptionCard({
  rideType,
  selected,
  onSelect,
  priceRange,
  eta,
}: RideOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
        selected
          ? "border-uber-green bg-uber-green/10 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80"
      }`}
    >
      <span className="text-xl" role="img" aria-hidden>
        {RIDE_EMOJI[rideType]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{RIDE_LABELS[rideType]}</p>
        {priceRange && (
          <p className="mt-0.5 truncate text-xs text-gray-600">{priceRange}</p>
        )}
        {eta && (
          <p className="text-xs text-gray-500">{eta} min</p>
        )}
      </div>
      {selected && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-uber-green text-[10px] font-bold text-white">
          ✓
        </span>
      )}
    </button>
  );
}
