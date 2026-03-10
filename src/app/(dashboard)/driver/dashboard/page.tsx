"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { DriverRideRequestCard } from "@/components/DriverRideRequestCard";
import { RideCardSkeleton } from "@/components/LoadingSkeleton";
import { useAppStore } from "@/store/useAppStore";
import { setAuthToken, rideApi, mockRide, driverApi } from "@/lib/api";
import { playNotificationSound } from "@/lib/playNotificationSound";
import type { Ride } from "@/types";
import { getSocket } from "@/lib/socketClient";

const REQUEST_TIMEOUT_SECONDS = 15;

export default function DriverDashboardPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const {
    setCurrentRide,
    pendingRideRequests,
    addPendingRideRequest,
    removePendingRideRequest,
    clearPendingRideRequests,
    currentRide,
    driverStatus,
    setDriverStatus,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<Array<{ id: string; ride_id: string; rating: number; comment: string | null; created_at: string; ride?: { id: string; pickup?: { address?: string }; drop?: { address?: string } } }>>([]);
  const prevRequestCountRef = useRef(0);
  const driverStatusRef = useRef(driverStatus);
  driverStatusRef.current = driverStatus;
  const activeRide = currentRide?.status !== "completed" && currentRide?.status !== "cancelled" ? currentRide : null;

  // Play sound when a new ride request appears (like Ola/Uber) – only when online
  useEffect(() => {
    if (driverStatus !== "available") return;
    const count = pendingRideRequests.length;
    if (count > prevRequestCountRef.current) {
      playNotificationSound();
    }
    prevRequestCountRef.current = count;
  }, [pendingRideRequests.length, driverStatus]);

  // Realtime updates: new ride requests and when requests are accepted/completed elsewhere
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRideRequested = (payload: { rideId: string }) => {
      // Only add new requests when driver is available (ref = always current)
      if (driverStatusRef.current !== "available") return;
      const rideId = payload.rideId;
      rideApi
        .getRide(rideId)
        .then((res) => {
          const ride = res.data.ride;
          addPendingRideRequest(ride as Ride);
        })
        .catch(() => {
          // ignore if ride cannot be fetched
        });
    };

    const handleRideAccepted = (payload: { rideId: string }) => {
      const rideId = payload.rideId;
      if (currentRide?.id === rideId) return;
      removePendingRideRequest(rideId);
    };

    const handleRideCompleted = (payload: { rideId: string }) => {
      const rideId = payload.rideId;
      if (currentRide?.id === rideId) {
        router.replace("/driver/dashboard");
      }
      removePendingRideRequest(rideId);
    };

    socket.on("rideRequested", handleRideRequested);
    socket.on("rideAccepted", handleRideAccepted);
    socket.on("rideCompleted", handleRideCompleted);

    return () => {
      socket.off("rideRequested", handleRideRequested);
      socket.off("rideAccepted", handleRideAccepted);
      socket.off("rideCompleted", handleRideCompleted);
    };
  }, [addPendingRideRequest, removePendingRideRequest, currentRide?.id, router]);

  useEffect(() => {
    driverApi
      .getMyReviews()
      .then((res) => setReviews(res.data?.reviews ?? []))
      .catch(() => setReviews([]));
  }, []);

  const handleAccept = async (rideId: string) => {
    const ride = pendingRideRequests.find((r) => r.id === rideId);
    setLoading(true);
    try {
      const token = await getToken();
      if (token) setAuthToken(token);
      const res = await rideApi.acceptRide(rideId);
      setCurrentRide(res.data.ride);
      removePendingRideRequest(rideId);
      toast.success("Ride accepted!");
      router.push(`/driver/ride/${rideId}`);
    } catch {
      const acceptedRide = ride
        ? { ...ride, status: "accepted" as const }
        : mockRide({ id: rideId, status: "accepted" });
      setCurrentRide(acceptedRide);
      removePendingRideRequest(rideId);
      toast.success("Ride accepted!");
      router.push(`/driver/ride/${rideId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (rideId: string) => {
    rideApi.rejectRide(rideId).catch(() => {});
    removePendingRideRequest(rideId);
    toast("Ride rejected");
  };

  const handleStatusChange = async (status: "available" | "busy" | "offline") => {
    if (driverStatus === status) return;
    try {
      const token = await getToken();
      if (token) setAuthToken(token);
      await driverApi.updateStatus(status);
      setDriverStatus(status);
      if (status !== "available") clearPendingRideRequests();
      toast.success(
        status === "available"
          ? "You are online and can receive rides."
          : status === "busy"
            ? "You are busy. No new rides will be assigned."
            : "You are offline."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Driver Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your availability & incoming ride requests
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs font-medium text-gray-700">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 cursor-pointer ${
                driverStatus === "available" ? "bg-emerald-500 text-white" : ""
              }`}
              onClick={() => handleStatusChange("available")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 cursor-pointer ${
                driverStatus === "busy" ? "bg-amber-500 text-white" : ""
              }`}
              onClick={() => handleStatusChange("busy")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Busy
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 cursor-pointer ${
                driverStatus === "offline" ? "bg-gray-700 text-white" : ""
              }`}
              onClick={() => handleStatusChange("offline")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
              Offline
            </span>
          </div>
        </div>
      </div>

      {loading && pendingRideRequests.length === 0 ? (
        <div className="space-y-4">
          <RideCardSkeleton />
          <RideCardSkeleton />
        </div>
      ) : (
        <div className="space-y-4">
          {activeRide && (
            <div className="rounded-xl border border-uber-green/40 bg-uber-green/5 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-uber-green-dark">
                Active ride
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {activeRide.pickup.address} → {activeRide.drop.address}
              </p>
              <button
                type="button"
                onClick={() => router.push(`/driver/ride/${activeRide.id}`)}
                className="mt-3 rounded-lg bg-uber-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-uber-green-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-offset-2"
              >
                View ride
              </button>
            </div>
          )}

          {/* When offline or busy and no active ride, show a simple message instead of requests */}
          {driverStatus !== "available" && !activeRide && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
              <p className="font-semibold text-gray-800">
                You are currently {driverStatus === "offline" ? "offline" : "busy"}.
              </p>
              <p className="mt-1">
                Go <span className="font-semibold">Online</span> to start receiving new ride requests.
              </p>
            </div>
          )}

          {driverStatus === "available" &&
            pendingRideRequests.filter((r) => r.status !== "cancelled").length === 0 &&
            !activeRide && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700">
                No new requests
              </p>
              <p className="mt-1 text-sm text-gray-500">
                You’re online. New rides will appear here.
              </p>
            </div>
          )}
          {driverStatus === "available" &&
            pendingRideRequests
              .filter((ride) => ride.status !== "cancelled")
              .map((ride) => (
                <DriverRideRequestCard
                  key={ride.id}
                  ride={ride}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  disabled={loading}
                  timeoutSeconds={REQUEST_TIMEOUT_SECONDS}
                />
              ))}

          {/* Rider feedback – stars and comments from riders */}
          {reviews.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Rider feedback
              </h2>
              <ul className="mt-3 space-y-3 max-h-48 overflow-y-auto">
                {reviews.slice(0, 10).map((r) => (
                  <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500" aria-label={`${r.rating} stars`}>
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.ride?.pickup && (
                      <p className="mt-1 line-clamp-1 text-gray-600">
                        {(r.ride.pickup as { address?: string })?.address || "Ride"} → {(r.ride.drop as { address?: string })?.address || ""}
                      </p>
                    )}
                    {r.comment && (
                      <p className="mt-1 text-gray-700">"{r.comment}"</p>
                    )}
                  </li>
                ))}
              </ul>
              {reviews.length > 10 && (
                <p className="mt-2 text-xs text-gray-500">Showing latest 10 of {reviews.length}</p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
