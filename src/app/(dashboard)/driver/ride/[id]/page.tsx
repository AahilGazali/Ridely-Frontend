"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { MapView } from "@/components/MapView";
import { RideStatusStepper } from "@/components/RideStatusStepper";
import { PaymentSummary } from "@/components/PaymentSummary";
import { useAppStore } from "@/store/useAppStore";
import type { LatLng, RideStatus } from "@/types";
import { rideApi } from "@/lib/api";

const TRIP_ANIMATION_DURATION_MS = 45000;

/** Driver can advance from these statuses; include "requested" so button shows even if accept didn't persist */
const DRIVER_NEXT_STATUS: Partial<Record<RideStatus, RideStatus>> = {
  requested: "driver_arriving",
  accepted: "driver_arriving",
  driver_arriving: "in_progress",
  in_progress: "completed",
};

export default function DriverRidePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentRide, setCurrentRide, driverLocation, setDriverLocation, addDriverCompletedRide } = useAppStore();
  const [status, setStatus] = useState<RideStatus | null>(
    currentRide?.id === id ? currentRide.status : null
  );
  const [updating, setUpdating] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const tripAnimationRef = useRef<number | null>(null);

  // Fetch ride on mount and poll; don't depend on currentRide to avoid effect loop and shakiness
  useEffect(() => {
    let mounted = true;
    const fetchRide = () => {
      rideApi
        .getRide(id)
        .then((res) => {
          if (!mounted) return;
          const ride = res.data.ride;
          setCurrentRide(ride);
          setStatus(ride.status);
          if (ride.status === "completed" || ride.status === "cancelled") {
            setCurrentRide(null);
            setDriverLocation(null);
            if (ride.status === "completed") addDriverCompletedRide(ride);
            router.replace("/driver/dashboard");
          }
        })
        .catch(() => {
          if (!mounted) return;
          // Keep existing currentRide/status so driver still sees ride and action button
        });
    };
    fetchRide();
    const t = setInterval(fetchRide, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [id, setCurrentRide, setDriverLocation, addDriverCompletedRide, router]);

  const ride = currentRide?.id === id ? currentRide : null;
  const rawStatus = (status ?? ride?.status ?? "").toString().toLowerCase() as RideStatus;
  const displayStatus = rawStatus || "accepted";
  const otpVerified = !!ride?.otpVerifiedAt;
  const needsOtpToStart = (displayStatus === "accepted" || displayStatus === "driver_arriving") && !otpVerified;
  const nextStatus = DRIVER_NEXT_STATUS[displayStatus] ?? (displayStatus === "accepted" ? "driver_arriving" : displayStatus === "driver_arriving" ? "in_progress" : displayStatus === "in_progress" ? "completed" : null);
  const canShowNextAction = nextStatus && (nextStatus !== "in_progress" || otpVerified);

  // When "in progress", animate vehicle along the route from start to stop
  useEffect(() => {
    if (status !== "in_progress" || !ride) {
      if (tripAnimationRef.current != null) {
        cancelAnimationFrame(tripAnimationRef.current);
        tripAnimationRef.current = null;
      }
      if (status !== "in_progress") setDriverLocation(null);
      return;
    }
    const path = routePath.length >= 2 ? routePath : [ride.pickup, ride.drop];
    setDriverLocation(path[0]);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / TRIP_ANIMATION_DURATION_MS, 1);
      const eased = t * t * (3 - 2 * t);
      const index = eased * (path.length - 1);
      const i0 = Math.floor(index);
      const i1 = Math.min(i0 + 1, path.length - 1);
      const frac = index - i0;
      const lat = path[i0].lat + (path[i1].lat - path[i0].lat) * frac;
      const lng = path[i0].lng + (path[i1].lng - path[i0].lng) * frac;
      setDriverLocation({ lat, lng });
      if (t < 1) tripAnimationRef.current = requestAnimationFrame(tick);
      else tripAnimationRef.current = null;
    };
    tripAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (tripAnimationRef.current != null) {
        cancelAnimationFrame(tripAnimationRef.current);
        tripAnimationRef.current = null;
      }
    };
  }, [status, ride?.id, routePath, setDriverLocation]);

  const handleVerifyOtp = async () => {
    const otp = otpInput.trim();
    if (!otp || otp.length !== 4) {
      toast.error("Enter the 4-digit OTP from the rider");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await rideApi.verifyOtp(id, otp);
      setCurrentRide(res.data.ride);
      setStatus(res.data.ride.status);
      setOtpInput("");
      toast.success("OTP verified. You can start the trip.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP. Try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    // Block "Start trip" unless OTP is verified (backend also enforces this)
    if (nextStatus === "in_progress" && !otpVerified) {
      toast.error("Verify the OTP from the rider first to start the trip.");
      return;
    }
    setUpdating(true);
    try {
      if (displayStatus === "requested") {
        await rideApi.acceptRide(id);
      }
      const res = await rideApi.updateRideStatus(id, nextStatus);
      setCurrentRide(res.data.ride);
      setStatus(res.data.ride.status);
      toast.success(`Status: ${nextStatus}`);
      if (nextStatus === "completed") {
        setDriverLocation(null);
        addDriverCompletedRide({ ...res.data.ride, status: "completed", completedAt: new Date().toISOString() });
        setShowPayment(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update status.";
      toast.error(message);
      // Do not update local state on failure so driver sees they must verify OTP
    } finally {
      setUpdating(false);
    }
  };

  if (!ride) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading ride...</p>
          <Link href="/driver/dashboard" className="mt-4 text-uber-green">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const fare =
    ride.fare ?? ride.estimatedFare?.maxFare ?? ride.estimatedFare?.minFare ?? 0;
  const distanceKm = ride.estimatedFare?.distanceKm;
  const durationMin = ride.estimatedFare?.durationMinutes;

  const handlePaymentDone = () => {
    toast.success("Payment collected");
    router.push("/driver/dashboard");
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
      <MapView
        center={{
          lat: (ride.pickup.lat + ride.drop.lat) / 2,
          lng: (ride.pickup.lng + ride.drop.lng) / 2,
        }}
        pickup={ride.pickup}
        drop={ride.drop}
        driverLocation={status === "in_progress" ? driverLocation : null}
        driverVehicleType={ride.rideType}
        showRoute
        showMyLocation
        fitBounds={status !== "in_progress"}
        onRouteReady={setRoutePath}
        className="absolute inset-0"
      />

      <div className="absolute bottom-0 left-0 right-0 flex justify-center px-4 pb-6 pt-2 safe-bottom">
        <div className="w-full max-w-lg max-h-[70vh] shrink-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          {showPayment || displayStatus === "completed" ? (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Collect payment
              </p>
              <PaymentSummary
                items={[
                  { label: "Trip fare", amount: fare },
                  ...(distanceKm
                    ? [{ label: `Distance (${distanceKm.toFixed(1)} km)`, amount: 0 }]
                    : []),
                  ...(durationMin
                    ? [{ label: `Time (~${durationMin} min)`, amount: 0 }]
                    : []),
                ]}
                total={fare}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePaymentDone}
                  className="flex-1 rounded-xl bg-uber-green py-3 font-semibold text-white shadow-sm transition hover:bg-uber-green-dark"
                >
                  Cash received
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {showQr ? "Hide QR" : "Show QR code"}
                </button>
              </div>
              {showQr && (
                <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-center text-sm text-gray-600">
                  <p className="mb-2 font-medium text-gray-800">
                    Scan to pay online
                  </p>
                  <div className="mx-auto mb-2 flex justify-center rounded-lg bg-white p-2">
                    <QRCodeSVG
                      value={(() => {
                        const am = Math.round(fare);
                        return `upi://pay?pa=driver@ridely.upi&pn=Ridely%20Driver&am=${am}&cu=INR`;
                      })()}
                      size={128}
                      level="M"
                      includeMargin
                    />
                  </div>
                  <p>UPI: <span className="font-semibold">driver@ridely.upi</span> · Amount: ₹{Math.round(fare)}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Your trip
              </p>
              <RideStatusStepper currentStatus={displayStatus ?? "accepted"} variant="driver" />
              {needsOtpToStart && (
                <div className="mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Enter OTP from rider to start trip
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-xl font-bold tracking-[0.3em] focus:border-uber-green focus:outline-none focus:ring-2 focus:ring-uber-green/30"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otpInput.trim().length !== 4}
                      className="rounded-lg bg-uber-green px-4 py-2.5 font-semibold text-white transition hover:bg-uber-green-dark disabled:opacity-50"
                    >
                      {verifyingOtp ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Ask the rider for their 4-digit OTP shown on their app.
                  </p>
                </div>
              )}
              <div className="mt-4 space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-500">Pickup (rider):</span>{" "}
                  {ride.pickup?.address || "Pickup location"}
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Drop (rider):</span>{" "}
                  {ride.drop?.address || "Drop location"}
                </p>
              </div>
              {canShowNextAction && (
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="mt-4 w-full rounded-xl bg-uber-green py-3.5 font-semibold text-white shadow-sm transition hover:bg-uber-green-dark disabled:opacity-50"
                >
                  {updating
                    ? "Updating…"
                    : nextStatus === "driver_arriving"
                      ? "I'm arriving at pickup"
                      : nextStatus === "in_progress"
                        ? "Start trip"
                        : nextStatus === "completed"
                          ? "Complete trip"
                          : `Mark as ${nextStatus.replace("_", " ")}`}
                </button>
              )}
              {!nextStatus && displayStatus !== "completed" && displayStatus !== "cancelled" && (
                <p className="mt-4 text-center text-sm text-amber-600">Loading…</p>
              )}
              <Link
                href="/driver/dashboard"
                className="mt-3 flex w-full justify-center rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back to dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
