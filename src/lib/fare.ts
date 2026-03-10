/** Client-side fare and time estimation in INR, matching backend logic. */

import type { FareEstimate, RideType } from "@/types";

// Keep in sync with backend/src/utils/fareCalculator.js
const RATES: Record<RideType, { base: number; perKm: number }> = {
  bike: { base: 40, perKm: 12 },
  mini: { base: 80, perKm: 22 },
  sedan: { base: 120, perKm: 28 },
  auto: { base: 60, perKm: 18 },
};

const MIN_FARE_INR = 35;
const MAX_FARE_MULTIPLIER = 1.35; // max = estimated * this

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two lat/lng points in kilometers. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getFareEstimateClient(
  pickup: { lat: number; lng: number },
  drop: { lat: number; lng: number },
  rideType: RideType
): FareEstimate {
  const rate = RATES[rideType] ?? RATES.sedan;
  const distanceKm = haversineDistanceKm(
    pickup.lat,
    pickup.lng,
    drop.lat,
    drop.lng
  );
  const rawFare = rate.base + distanceKm * rate.perKm;
  const minFare = Math.max(MIN_FARE_INR, Math.round(rawFare * 0.9));
  const maxFare = Math.round(rawFare * MAX_FARE_MULTIPLIER);
  const durationMinutes = Math.max(5, Math.ceil(distanceKm * 3)); // ~3 min per km

  return {
    rideType,
    minFare,
    maxFare,
    durationMinutes,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}

