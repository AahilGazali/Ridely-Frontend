import axios, { AxiosInstance, AxiosError } from "axios";
import type { Ride } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

/** Set by auth layer (e.g. AuthSync) so requests include Clerk JWT. */
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Backend returns snake_case; normalize to frontend Ride (camelCase) so rideType, etc. work. */
function normalizeRide(raw: Record<string, unknown>): Ride {
  const pickup = (raw.pickup as Ride["pickup"]) ?? { placeId: "", address: "", lat: 0, lng: 0 };
  const drop = (raw.drop as Ride["drop"]) ?? { placeId: "", address: "", lat: 0, lng: 0 };
  return {
    id: String(raw.id ?? ""),
    riderId: String(raw.rider_id ?? raw.riderId ?? ""),
    driverId: raw.driver_id != null ? String(raw.driver_id) : (raw.driverId as string | undefined),
    pickup,
    drop,
    rideType: (raw.ride_type ?? raw.rideType ?? "sedan") as Ride["rideType"],
    status: (raw.status ?? "requested") as Ride["status"],
    fare: raw.fare != null ? Number(raw.fare) : undefined,
    estimatedFare: raw.estimated_fare as Ride["estimatedFare"] | undefined,
    requestedAt: String(raw.created_at ?? raw.requestedAt ?? ""),
    startedAt: raw.started_at != null ? String(raw.started_at) : (raw.startedAt as string | undefined),
    completedAt: raw.completed_at != null ? String(raw.completed_at) : (raw.completedAt as string | undefined),
    driverLocation: (raw.driver_location ?? raw.driverLocation) as Ride["driverLocation"],
    eta: raw.eta as string | undefined,
    rating: raw.rating as number | undefined,
    feedback: raw.feedback as string | undefined,
    paymentStatus: (raw.payment_status ?? raw.paymentStatus) as Ride["paymentStatus"],
    otp: raw.otp != null ? String(raw.otp) : undefined,
    otpVerifiedAt: raw.otp_verified_at != null ? String(raw.otp_verified_at) : undefined,
  };
}

/**
 * Axios instance for API calls. Auth token is attached via request interceptor;
 * set it with setAuthToken() from a component that has access to Clerk (e.g. useAuth().getToken()).
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

// Normalize ride(s) from backend snake_case to frontend camelCase; then global error handling
api.interceptors.response.use(
  (res) => {
    if (res.data?.ride) res.data.ride = normalizeRide(res.data.ride as Record<string, unknown>);
    if (Array.isArray(res.data?.rides))
      res.data.rides = (res.data.rides as Record<string, unknown>[]).map(normalizeRide);
    return res;
  },
  (err: AxiosError) => {
    const message =
      (err.response?.data as { message?: string })?.message ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

/** Ride API */
export const rideApi = {
  estimateFare: (pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }, rideType: string) =>
    api.post<{ estimate: import("@/types").FareEstimate }>("/rides/estimate", {
      pickup,
      drop,
      rideType,
    }),

  requestRide: (data: {
    pickup: { placeId: string; address: string; lat: number; lng: number };
    drop: { placeId: string; address: string; lat: number; lng: number };
    rideType: string;
  }) =>
    api.post<{ ride: import("@/types").Ride }>("/rides", data),

  getRide: (id: string) =>
    api.get<{ ride: import("@/types").Ride }>(`/rides/${id}`),

  cancelRide: (id: string) =>
    api.post<{ ride: import("@/types").Ride }>(`/rides/${id}/cancel`),

  getHistory: (role: "rider" | "driver") =>
    api.get<{ rides: import("@/types").Ride[] }>("/rides/history", {
      params: { role },
    }),

  acceptRide: (id: string) =>
    api.post<{ ride: import("@/types").Ride }>(`/rides/${id}/accept`),

  rejectRide: (id: string) =>
    api.post<{ ride: import("@/types").Ride }>(`/rides/${id}/reject`),

  updateRideStatus: (id: string, status: string) =>
    api.patch<{ ride: import("@/types").Ride }>(`/rides/${id}/status`, {
      status,
    }),

  verifyOtp: (id: string, otp: string) =>
    api.post<{ ride: import("@/types").Ride }>(`/rides/${id}/verify-otp`, { otp }),

  submitRating: (id: string, rating: number, feedback?: string) =>
    api.post<{ ride: import("@/types").Ride }>(`/rides/${id}/rate`, {
      rating,
      feedback,
    }),
};

/** Review API – rider submits rating after completed ride (uses POST /api/reviews). */
export const reviewApi = {
  createReview: (rideId: string, rating: number, comment?: string) =>
    api.post<{ review: { id: string; ride_id: string; rating: number; comment: string | null } }>("/reviews", {
      rideId,
      rating,
      comment: comment || undefined,
    }),
};

/** Driver API – status, location, reviews. */
export const driverApi = {
  updateStatus: (status: "available" | "busy" | "offline") =>
    api.patch<{ driver: { id: string; status: string } }>("/drivers/status", {
      status,
    }),
  getMyReviews: () =>
    api.get<{
      reviews: Array<{
        id: string;
        ride_id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        ride?: { id: string; pickup?: { address?: string }; drop?: { address?: string } };
      }>;
    }>("/drivers/me/reviews"),
};

/** SOS API (rider only). Pass token so the request is always authenticated. */
export const sosApi = {
  sendSos: (
    rideId: string,
    lat?: number,
    lng?: number,
    bearerToken?: string | null
  ) =>
    api.post<{ alert: { id: string; ride_id: string; location: { lat: number; lng: number }; created_at: string } }>(
      "/sos",
      { rideId, lat, lng },
      bearerToken ? { headers: { Authorization: `Bearer ${bearerToken}` } } : undefined
    ),
};

/** Payment API – Stripe Checkout and mark paid (cash/UPI). */
export const paymentApi = {
  createCheckoutSession: (rideId: string, amountCents?: number) =>
    api.post<{ url: string; sessionId: string }>("/payments/create-checkout-session", {
      rideId,
      ...(amountCents != null && { amount: amountCents }),
    }),
  markPaid: (rideId: string, method: "cash" | "upi") =>
    api.post<{ ride: import("@/types").Ride }>("/payments/mark-paid", { rideId, method }),
};

/** Mock helpers for when backend is not ready - use in UI until API is connected */
export const mockRide = (overrides?: Partial<import("@/types").Ride>): import("@/types").Ride => ({
  id: "ride-1",
  riderId: "rider-1",
  pickup: {
    placeId: "p1",
    address: "123 Main St",
    lat: 37.7749,
    lng: -122.4194,
  },
  drop: {
    placeId: "d1",
    address: "456 Oak Ave",
    lat: 37.7849,
    lng: -122.4094,
  },
  rideType: "sedan",
  status: "requested",
  requestedAt: new Date().toISOString(),
  estimatedFare: {
    rideType: "sedan",
    minFare: 15,
    maxFare: 22,
    durationMinutes: 18,
    distanceKm: 5.2,
  },
  ...overrides,
});
