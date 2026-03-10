"use client";

import { useState, useEffect, useRef } from "react";
import type { Ride, RideType } from "@/types";
import { formatINR, formatINRRange } from "@/lib/formatCurrency";

const RIDE_TYPE_LABELS: Record<RideType, string> = {
  bike: "Bike",
  mini: "Mini",
  sedan: "Sedan",
  auto: "Auto",
};

export interface DriverRideRequestCardProps {
  /** Ride request to display */
  ride: Ride;
  /** Called when driver accepts the ride */
  onAccept: (rideId: string) => void;
  /** Called when driver rejects the ride */
  onReject: (rideId: string) => void;
  /** Optional: disable buttons while an action is in progress */
  disabled?: boolean;
  /** Seconds to accept or reject before request expires (e.g. 15) */
  timeoutSeconds?: number;
  className?: string;
}

/**
 * Driver ride request card: pickup, drop, distance, rider fare, accept/reject.
 * Shows a countdown timer; auto-rejects when time runs out (like Ola/Uber).
 */
export function DriverRideRequestCard({
  ride,
  onAccept,
  onReject,
  disabled = false,
  timeoutSeconds = 15,
  className = "",
}: DriverRideRequestCardProps) {
  const est = ride.estimatedFare;
  const distanceKm = est?.distanceKm ?? 0;
  const durationMin = est?.durationMinutes;
  const fare = ride.fare ?? est?.maxFare ?? est?.minFare;
  const hasRange = est && est.minFare !== est.maxFare && est.minFare != null && est.maxFare != null;
  const fareDisplay =
    fare != null
      ? hasRange
        ? formatINRRange(est!.minFare, est!.maxFare)
        : formatINR(fare)
      : "—";
  const rideTypeLabel = RIDE_TYPE_LABELS[ride.rideType] ?? ride.rideType;

  const requestedAtMs = ride.requestedAt ? new Date(ride.requestedAt).getTime() : Date.now();
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const elapsed = (Date.now() - requestedAtMs) / 1000;
    return Math.max(0, Math.ceil(timeoutSeconds - elapsed));
  });
  const expiredRef = useRef(false);

  useEffect(() => {
    if (expiredRef.current) return;
    const tick = () => {
      if (expiredRef.current) return;
      const elapsed = (Date.now() - requestedAtMs) / 1000;
      const left = Math.max(0, Math.ceil(timeoutSeconds - elapsed));
      setSecondsLeft(left);
      if (left <= 0) {
        expiredRef.current = true;
        onReject(ride.id);
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [ride.id, requestedAtMs, timeoutSeconds, onReject]);

  const progressPercent = timeoutSeconds > 0 ? (secondsLeft / timeoutSeconds) * 100 : 0;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${className}`}
    >
      {/* Header: New request + ride type + countdown */}
      <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            New request
          </span>
          <div className="flex items-center gap-2">
            {secondsLeft > 0 && (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  secondsLeft <= 5 ? "text-amber-600" : "text-gray-600"
                }`}
                aria-live="polite"
              >
                {secondsLeft}s
              </span>
            )}
            <span className="rounded-full bg-uber-green/15 px-3 py-1 text-xs font-semibold text-uber-green-dark">
              {rideTypeLabel}
            </span>
          </div>
        </div>
        {timeoutSeconds > 0 && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-uber-green transition-all duration-500 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {/* Route: Pickup → Drop */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white bg-uber-green shadow-sm"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Pickup
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-900" title={ride.pickup.address}>
                {ride.pickup.address}
              </p>
            </div>
          </div>
          <div className="ml-1.5 h-4 w-0.5 shrink-0 bg-gray-200" aria-hidden />
          <div className="flex gap-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white bg-gray-700 shadow-sm"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Drop
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-900" title={ride.drop.address}>
                {ride.drop.address}
              </p>
            </div>
          </div>
        </div>

        {/* Rider fare (prominent) + distance/duration */}
        <div className="mt-4 rounded-xl bg-uber-green/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-uber-green-dark">
            Rider fare
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {fareDisplay}
          </p>
          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            {distanceKm > 0 && (
              <span>{distanceKm.toFixed(1)} km</span>
            )}
            {durationMin != null && durationMin > 0 && (
              <span>~{durationMin} min</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100">
        <button
          type="button"
          onClick={() => onReject(ride.id)}
          disabled={disabled}
          className="flex-1 py-4 text-sm font-semibold text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-inset"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => onAccept(ride.id)}
          disabled={disabled}
          className="flex-1 bg-uber-green py-4 text-sm font-semibold text-white transition hover:bg-uber-green-dark disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-inset"
        >
          Accept ride
        </button>
      </div>
    </article>
  );
}
