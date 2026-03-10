/**
 * Shared types for Uber Clone
 */

export type UserRole = "rider" | "driver";

export type RideType = "bike" | "mini" | "sedan" | "auto";

export type RideStatus =
  | "requested"
  | "accepted"
  | "driver_arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

export interface FareEstimate {
  rideType: RideType;
  minFare: number;
  maxFare: number;
  durationMinutes: number;
  distanceKm: number;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: PlaceResult;
  drop: PlaceResult;
  rideType: RideType;
  status: RideStatus;
  fare?: number;
  estimatedFare?: FareEstimate;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  driverLocation?: LatLng;
  eta?: string;
  rating?: number;
  feedback?: string;
  /** From backend: "pending" | "paid" – used to show Pay button */
  paymentStatus?: "pending" | "paid";
  /** 4-digit OTP shown to rider after driver accepts; driver must enter to start trip */
  otp?: string;
  /** Set when driver verifies OTP; required before status can become in_progress */
  otpVerifiedAt?: string;
}

export interface RideRequestCardProps {
  ride: Ride;
  onAccept: (rideId: string) => void;
  onReject: (rideId: string) => void;
}

export interface PaymentMethod {
  id: string;
  type: "card";
  last4: string;
  brand: string;
  isDefault: boolean;
}
