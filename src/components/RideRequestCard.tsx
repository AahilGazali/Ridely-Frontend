"use client";

import type { Ride } from "@/types";
import { formatINR } from "@/lib/formatCurrency";
import { StatusBadge } from "./StatusBadge";

interface RideRequestCardProps {
  ride: Ride;
  onAccept?: (rideId: string) => void;
  onReject?: (rideId: string) => void;
  showActions?: boolean;
  onClick?: () => void;
}

/**
 * Card showing ride summary: pickup, drop, fare, status. Used in driver queue and ride history.
 */
export function RideRequestCard({
  ride,
  onAccept,
  onReject,
  showActions = false,
  onClick,
}: RideRequestCardProps) {
  const fare = ride.fare ?? ride.estimatedFare?.maxFare;
  const fareStr = fare != null ? formatINR(fare) : "—";

  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:border-gray-300 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-700">
            {ride.pickup.address}
          </p>
          <p className="mt-1 truncate text-sm text-gray-500">
            → {ride.drop.address}
          </p>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-black">{fareStr}</span>
        {showActions && onAccept && onReject && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReject(ride.id);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAccept(ride.id);
              }}
              className="rounded-lg bg-uber-green px-3 py-1.5 text-sm font-medium text-white hover:bg-uber-green-dark"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
