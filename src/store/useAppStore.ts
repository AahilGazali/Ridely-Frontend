import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Ride, PlaceResult, FareEstimate, LatLng, RideType } from "@/types";

const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

interface AppState {
  // User
  currentUser: { id: string; role: "rider" | "driver"; email?: string } | null;
  setCurrentUser: (user: AppState["currentUser"]) => void;

  // Current ride
  currentRide: Ride | null;
  setCurrentRide: (ride: Ride | null) => void;

  // Ride status (synced with currentRide but for quick UI updates)
  rideStatus: Ride["status"] | null;
  setRideStatus: (status: Ride["status"] | null) => void;

  // Driver location (for rider tracking)
  driverLocation: LatLng | null;
  setDriverLocation: (loc: LatLng | null) => void;

  // Fare estimates per ride type (before requesting ride)
  fareEstimatesByType: Partial<Record<RideType, FareEstimate>>;
  setFareEstimatesByType: (byType: Partial<Record<RideType, FareEstimate>>) => void;
  clearFareEstimates: () => void;

  // Selected pickup/drop for booking panel
  pickup: PlaceResult | null;
  drop: PlaceResult | null;
  setPickup: (p: PlaceResult | null) => void;
  setDrop: (d: PlaceResult | null) => void;

  // Selected ride type
  selectedRideType: RideType;
  setSelectedRideType: (type: RideType) => void;

  // Pending ride requests (shown to drivers; added when rider requests)
  pendingRideRequests: Ride[];
  addPendingRideRequest: (ride: Ride) => void;
  removePendingRideRequest: (rideId: string) => void;
  clearPendingRideRequests: () => void;

  // Driver completed rides (for History & Earnings when API is unavailable or to merge)
  driverCompletedRides: Ride[];
  addDriverCompletedRide: (ride: Ride) => void;

  // Rider completed rides (for History & Payment when API is unavailable or to merge)
  riderCompletedRides: Ride[];
  addRiderCompletedRide: (ride: Ride) => void;

  // Driver availability status (online/busy/offline) for UI only
  driverStatus: "available" | "busy" | "offline";
  setDriverStatus: (status: "available" | "busy" | "offline") => void;

  // Last signed-in user id (so we clear data when account changes)
  lastKnownUserId: string | null;
  setLastKnownUserId: (id: string | null) => void;
  /** Clear rides/history for current user – call when switching account */
  clearUserSpecificData: () => void;

  // Reset ride-related state
  resetRideState: () => void;
}

const initialState = {
  currentUser: null,
  currentRide: null,
  rideStatus: null,
  driverLocation: null,
  fareEstimatesByType: {} as Partial<Record<RideType, FareEstimate>>,
  pickup: null,
  drop: null,
  selectedRideType: "sedan" as RideType,
  pendingRideRequests: [] as Ride[],
  driverCompletedRides: [] as Ride[],
  riderCompletedRides: [] as Ride[],
  lastKnownUserId: null as string | null,
  driverStatus: "available" as "available" | "busy" | "offline",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentUser: (currentUser) => set({ currentUser }),

      setCurrentRide: (currentRide) =>
        set({
          currentRide,
          rideStatus: currentRide?.status ?? null,
        }),

      setRideStatus: (rideStatus) => set({ rideStatus }),

      setDriverLocation: (driverLocation) => set({ driverLocation }),

      setFareEstimatesByType: (byType) =>
        set((s) => ({ fareEstimatesByType: { ...s.fareEstimatesByType, ...byType } })),
      clearFareEstimates: () => set({ fareEstimatesByType: {} }),

      setPickup: (pickup) => set({ pickup }),

      setDrop: (drop) => set({ drop }),

      setSelectedRideType: (selectedRideType) => set({ selectedRideType }),

      addPendingRideRequest: (ride) =>
        set((s) => ({
          pendingRideRequests: [...s.pendingRideRequests.filter((r) => r.id !== ride.id), ride],
        })),
      removePendingRideRequest: (rideId) =>
        set((s) => ({
          pendingRideRequests: s.pendingRideRequests.filter((r) => r.id !== rideId),
        })),
      clearPendingRideRequests: () => set({ pendingRideRequests: [] }),

      addDriverCompletedRide: (ride) =>
        set((s) => {
          const completed = { ...ride, status: "completed" as const, completedAt: ride.completedAt || new Date().toISOString() };
          const rest = s.driverCompletedRides.filter((r) => r.id !== ride.id);
          return { driverCompletedRides: [completed, ...rest] };
        }),

      addRiderCompletedRide: (ride) =>
        set((s) => {
          const completed = { ...ride, status: "completed" as const, completedAt: ride.completedAt || new Date().toISOString() };
          const rest = s.riderCompletedRides.filter((r) => r.id !== ride.id);
          return { riderCompletedRides: [completed, ...rest] };
        }),

      setLastKnownUserId: (lastKnownUserId) => set({ lastKnownUserId }),

      setDriverStatus: (driverStatus) => set({ driverStatus }),

      clearUserSpecificData: () =>
        set({
          currentRide: null,
          rideStatus: null,
          pickup: null,
          drop: null,
          pendingRideRequests: [],
          driverCompletedRides: [],
          riderCompletedRides: [],
          driverStatus: "available",
        }),

      resetRideState: () =>
        set({
          currentRide: null,
          rideStatus: null,
          driverLocation: null,
          fareEstimatesByType: {},
          pickup: null,
          drop: null,
          // keep driverCompletedRides, riderCompletedRides so History/Earnings still show them
          driverStatus: "available",
        }),
    }),
    {
      name: "uber-clone-store",
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      // Don't persist currentRide/rideStatus/driverLocation so after refresh or server restart
      // the user lands on the booking page, not "ride in progress"
      partialize: (state) => ({
        currentUser: state.currentUser,
        pickup: state.pickup,
        drop: state.drop,
        selectedRideType: state.selectedRideType,
        pendingRideRequests: state.pendingRideRequests,
        driverCompletedRides: state.driverCompletedRides,
        riderCompletedRides: state.riderCompletedRides,
        lastKnownUserId: state.lastKnownUserId,
      }),
    }
  )
);
