"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LocationSearchInput } from "@/components/LocationSearchInput";
import { RideOptionCard } from "@/components/RideOptionCard";
import type { PlaceResult, RideType, FareEstimate } from "@/types";
import { formatINRRange } from "@/lib/formatCurrency";

const RIDE_TYPES: RideType[] = ["bike", "mini", "sedan", "auto"];

export interface RideBookingPanelProps {
  /** Current pickup place (address shown in input) */
  pickup: PlaceResult | null;
  /** Current drop place */
  drop: PlaceResult | null;
  /** Called when user selects a pickup from autocomplete */
  onPickupSelect: (place: PlaceResult) => void;
  /** Called when user selects a drop from autocomplete */
  onDropSelect: (place: PlaceResult) => void;
  /** Optional: let user choose pickup on map */
  onPickupMapSelect?: () => void;
  /** Optional: let user choose drop on map */
  onDropMapSelect?: () => void;
  /** Currently selected ride type */
  selectedRideType: RideType;
  /** Called when user selects a ride option */
  onRideTypeSelect: (type: RideType) => void;
  /** Fare estimates per ride type (INR, distance-based) */
  fareEstimatesByType: Partial<Record<RideType, FareEstimate>>;
  /** True while estimate API is loading */
  estimating?: boolean;
  /** Called when user taps "Request ride" */
  onRequestRide: () => void;
  /** True while request is in progress */
  requestLoading?: boolean;
  /** Optional class for the panel wrapper */
  className?: string;
  /** When true, render as an embedded panel (no floating/drag); for split layout */
  embedded?: boolean;
}

const PanelContent = ({
  pickup,
  drop,
  onPickupSelect,
  onDropSelect,
  onPickupMapSelect,
  onDropMapSelect,
  selectedRideType,
  onRideTypeSelect,
  fareEstimatesByType,
  estimating,
  onRequestRide,
  requestLoading,
  canRequest,
  selectedEstimate,
}: {
  pickup: PlaceResult | null;
  drop: PlaceResult | null;
  onPickupSelect: (place: PlaceResult) => void;
  onDropSelect: (place: PlaceResult) => void;
  onPickupMapSelect?: () => void;
  onDropMapSelect?: () => void;
  selectedRideType: RideType;
  onRideTypeSelect: (type: RideType) => void;
  fareEstimatesByType: Partial<Record<RideType, FareEstimate>>;
  estimating: boolean;
  onRequestRide: () => void;
  requestLoading: boolean;
  canRequest: boolean;
  selectedEstimate: FareEstimate | null;
}) => (
  <>
    {/* Pickup / Drop inputs */}
    <div className="space-y-1">
      <div className="relative">
        <span
          className="absolute left-4 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-uber-green shadow-sm"
          aria-hidden
        />
        <div className="pl-8">
          <LocationSearchInput
            placeholder="Enter pickup location"
            value={pickup?.address ?? ""}
            onSelect={onPickupSelect}
          />
          {onPickupMapSelect && (
            <button
              type="button"
              onClick={onPickupMapSelect}
              className="mt-1 text-xs font-medium text-uber-green hover:text-uber-green-dark"
            >
              Set pickup on map
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <span
          className="absolute left-4 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-gray-800 shadow-sm"
          aria-hidden
        />
        <div className="pl-8">
          <LocationSearchInput
            placeholder="Where to?"
            value={drop?.address ?? ""}
            onSelect={onDropSelect}
          />
          {onDropMapSelect && (
            <button
              type="button"
              onClick={onDropMapSelect}
              className="mt-1 text-xs font-medium text-uber-green hover:text-uber-green-dark"
            >
              Set drop on map
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Fare estimate */}
    <div className="mt-4 rounded-xl bg-gray-50/80 px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Fare estimate
      </h3>
      {estimating ? (
        <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-uber-green border-t-transparent" />
          Estimating...
        </div>
      ) : selectedEstimate ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
          <span className="text-gray-600">
            ~{selectedEstimate.distanceKm.toFixed(1)} km
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">
            ~{selectedEstimate.durationMinutes} min
          </span>
          <span className="font-semibold text-gray-900">
            {formatINRRange(selectedEstimate.minFare, selectedEstimate.maxFare)}
          </span>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-gray-500">
          {!pickup && !drop
            ? "Enter pickup and destination to see fare"
            : !drop
              ? "Enter destination to see fare"
              : "Enter pickup location to see fare"}
        </p>
      )}
    </div>

    {/* Ride options */}
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Choose ride type
      </h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {RIDE_TYPES.map((type) => {
          const est = fareEstimatesByType[type];
          return (
            <RideOptionCard
              key={type}
              rideType={type}
              selected={selectedRideType === type}
              onSelect={() => onRideTypeSelect(type)}
              priceRange={est ? formatINRRange(est.minFare, est.maxFare) : undefined}
              eta={est ? String(est.durationMinutes) : undefined}
            />
          );
        })}
      </div>
    </div>

    {/* Request ride button */}
    <button
      type="button"
      onClick={onRequestRide}
      disabled={!canRequest || requestLoading}
      className="mt-5 w-full rounded-xl bg-uber-green py-3.5 font-semibold text-white shadow-md transition hover:bg-uber-green-dark disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-offset-2"
    >
      {requestLoading ? "Requesting ride..." : "Request ride"}
    </button>
  </>
);

/**
 * Booking panel: pickup/drop, fare estimate, ride options, request button.
 * Use embedded in a split layout, or floating as a bottom sheet.
 */
export function RideBookingPanel({
  pickup,
  drop,
  onPickupSelect,
  onDropSelect,
  onPickupMapSelect,
  onDropMapSelect,
  selectedRideType,
  onRideTypeSelect,
  fareEstimatesByType = {},
  estimating = false,
  onRequestRide,
  requestLoading = false,
  className = "",
  embedded = false,
}: RideBookingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const canRequest = Boolean(pickup && drop);
  const selectedEstimate = fareEstimatesByType[selectedRideType] ?? null;

  if (embedded) {
    return (
      <div className={`flex h-full flex-col overflow-auto bg-white ${className}`}>
        <div className="flex-1 p-4 sm:p-5">
          <PanelContent
            pickup={pickup}
            drop={drop}
            onPickupSelect={onPickupSelect}
            onDropSelect={onDropSelect}
            onPickupMapSelect={onPickupMapSelect}
            onDropMapSelect={onDropMapSelect}
            selectedRideType={selectedRideType}
            onRideTypeSelect={onRideTypeSelect}
            fareEstimatesByType={fareEstimatesByType}
            estimating={estimating}
            onRequestRide={onRequestRide}
            requestLoading={requestLoading}
            canRequest={canRequest}
            selectedEstimate={selectedEstimate}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{ y: 0 }}
      className={`absolute bottom-0 left-0 right-0 z-10 flex justify-center px-3 pb-3 sm:px-4 sm:pb-4 ${className}`}
    >
      <div className="w-full max-w-md rounded-t-2xl border border-gray-200 border-b-0 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {/* Drag handle */}
        <button
          type="button"
          onClick={() => setExpanded((prev: boolean) => !prev)}
          className="flex w-full justify-center pt-3 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-inset rounded-t-2xl"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
        >
          <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            expanded ? "max-h-[80vh] overflow-y-auto" : "max-h-0"
          }`}
        >
          <div className="px-4 pb-5 pt-1">
            <PanelContent
              pickup={pickup}
              drop={drop}
              onPickupSelect={onPickupSelect}
              onDropSelect={onDropSelect}
              onPickupMapSelect={onPickupMapSelect}
              onDropMapSelect={onDropMapSelect}
              selectedRideType={selectedRideType}
              onRideTypeSelect={onRideTypeSelect}
              fareEstimatesByType={fareEstimatesByType}
              estimating={estimating}
              onRequestRide={onRequestRide}
              requestLoading={requestLoading}
              canRequest={canRequest}
              selectedEstimate={selectedEstimate}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
