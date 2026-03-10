"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { QRCodeSVG } from "qrcode.react";
import { MapView } from "@/components/MapView";
import { RideStatusStepper } from "@/components/RideStatusStepper";
import { SOSFloatingButton } from "@/components/SOSFloatingButton";
import { PaymentSummary } from "@/components/PaymentSummary";
import { useAppStore } from "@/store/useAppStore";
import type { RideStatus } from "@/types";
import { setAuthToken, rideApi, sosApi, paymentApi } from "@/lib/api";
import { playSosSentSound } from "@/lib/playNotificationSound";
import { getSocket } from "@/lib/socketClient";

export default function RiderRidePage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params.id as string;
  const { currentRide, setCurrentRide, driverLocation, setDriverLocation, removePendingRideRequest, setPickup, setDrop, addRiderCompletedRide } =
    useAppStore();

  const [status, setStatus] = useState<RideStatus | null>(
    currentRide?.id === id ? currentRide.status : null
  );
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | undefined>(
    currentRide?.id === id ? currentRide.paymentStatus : undefined
  );
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<"cash" | "upi" | null>(null);
  const [showQr, setShowQr] = useState(false);

  // Sync from store or fetch; poll so we see when driver marks completed. Redirect to dashboard only when completed AND paid.
  useEffect(() => {
    if (currentRide?.id === id) {
      setStatus(currentRide.status);
      setPaymentStatus(currentRide.paymentStatus);
    }
    const fetchRide = () => {
      rideApi
        .getRide(id)
        .then((res) => {
          const ride = res.data.ride;
          setCurrentRide(ride);
          setStatus(ride.status);
          setPaymentStatus(ride.paymentStatus);
          if (ride.status === "cancelled") {
            removePendingRideRequest(id);
            setCurrentRide(null);
            setPickup(null);
            setDrop(null);
            router.replace("/rider/dashboard");
            return;
          }
          if (ride.status === "completed" && ride.paymentStatus === "paid") {
            addRiderCompletedRide(ride);
            removePendingRideRequest(id);
            setCurrentRide(null);
            setPickup(null);
            setDrop(null);
            router.replace("/rider/dashboard");
          }
        })
        .catch(() => {});
    };
    fetchRide();
    const t = setInterval(fetchRide, 2500);
    return () => clearInterval(t);
  }, [id, setCurrentRide, removePendingRideRequest, setPickup, setDrop, addRiderCompletedRide, router]);

  // Realtime updates via Socket.io for this ride (status + driver location)
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    const refetchRide = () => {
      rideApi
        .getRide(id)
        .then((res) => {
          const ride = res.data.ride;
          setCurrentRide(ride);
          setStatus(ride.status);
          setPaymentStatus(ride.paymentStatus);
        })
        .catch(() => {});
    };

    const handleRideAccepted = (payload: { rideId: string }) => {
      if (payload.rideId !== id) return;
      refetchRide();
    };
    const handleRideStarted = (payload: { rideId: string }) => {
      if (payload.rideId !== id) return;
      refetchRide();
    };
    const handleRideCompleted = (payload: { rideId: string }) => {
      if (payload.rideId !== id) return;
      refetchRide();
    };
    const handleDriverLocation = (payload: { rideId?: string; lat: number; lng: number }) => {
      if (payload.rideId && payload.rideId !== id) return;
      setDriverLocation({ lat: payload.lat, lng: payload.lng });
    };

    socket.on("rideAccepted", handleRideAccepted);
    socket.on("rideStarted", handleRideStarted);
    socket.on("rideCompleted", handleRideCompleted);
    socket.on("driverLocationUpdate", handleDriverLocation);

    return () => {
      socket.off("rideAccepted", handleRideAccepted);
      socket.off("rideStarted", handleRideStarted);
      socket.off("rideCompleted", handleRideCompleted);
      socket.off("driverLocationUpdate", handleDriverLocation);
    };
  }, [id, setCurrentRide, setDriverLocation]);

  const ride = currentRide?.id === id ? currentRide : null;

  const canCancel =
    status === "requested" || status === "accepted" || status === "driver_arriving";

  const handleCancel = () => {
    if (!canCancel) return;
    setCancelling(true);
    rideApi
      .cancelRide(id)
      .then(() => {
        removePendingRideRequest(id);
        setStatus("cancelled");
        setCurrentRide(null);
        setPickup(null);
        setDrop(null);
        toast.success("Ride cancelled");
        router.push("/rider/dashboard");
      })
      .catch(() => {
        removePendingRideRequest(id);
        setStatus("cancelled");
        setCurrentRide(null);
        setPickup(null);
        setDrop(null);
        toast.success("Ride cancelled");
        router.push("/rider/dashboard");
      })
      .finally(() => setCancelling(false));
  };

  const handleSOS = async () => {
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in again to send SOS.");
        return;
      }
      setAuthToken(token);
      await sosApi.sendSos(id, ride.pickup.lat, ride.pickup.lng, token);
      playSosSentSound();
      toast.success("SOS sent. Emergency services notified.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send SOS. Try again.");
    }
  };

  const handlePayWithStripe = useCallback(async () => {
    setPaying(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in to pay.");
        return;
      }
      setAuthToken(token);
      const res = await paymentApi.createCheckoutSession(id);
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error("Could not start checkout.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed. Try again.");
    } finally {
      setPaying(false);
    }
  }, [id, getToken]);

  const handleMarkPaid = useCallback(
    async (method: "cash" | "upi") => {
      setMarkingPaid(method);
      try {
        const token = await getToken();
        if (token) setAuthToken(token);
        const res = await paymentApi.markPaid(id, method);
        const updated = res.data?.ride;
        if (updated) {
          setPaymentStatus("paid");
          setCurrentRide(updated);
          addRiderCompletedRide(updated);
          removePendingRideRequest(id);
          setCurrentRide(null);
          setPickup(null);
          setDrop(null);
          toast.success(method === "cash" ? "Marked as paid (cash). Thank you!" : "Marked as paid (UPI). Thank you!");
          router.replace(`/rider/review?rideId=${id}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not mark as paid. Try again.";
        if (msg.includes("404")) {
          toast.error("Ride not found. Restart the backend server and try again.");
        } else {
          toast.error(msg);
        }
      } finally {
        setMarkingPaid(null);
      }
    },
    [id, getToken, setCurrentRide, addRiderCompletedRide, removePendingRideRequest, setPickup, setDrop, router]
  );

  if (!ride) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading ride...</p>
          <Link href="/rider/dashboard" className="mt-4 text-uber-green">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <MapView
        center={{
          lat: (ride.pickup.lat + ride.drop.lat) / 2,
          lng: (ride.pickup.lng + ride.drop.lng) / 2,
        }}
        pickup={ride.pickup}
        drop={ride.drop}
        driverLocation={driverLocation ?? ride.driverLocation}
        driverVehicleType={ride.rideType}
        showRoute={status !== "requested"}
        showMyLocation
        className="absolute inset-0"
      />

      {status !== "completed" && <SOSFloatingButton onConfirm={handleSOS} />}

      {/* Bottom card: payment required after trip completed, else status & actions */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center px-4 pb-6 pt-2 safe-bottom">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          {status === "completed" && paymentStatus !== "paid" ? (
            <>
              <p className="mb-1 text-base font-bold text-gray-900">Trip completed</p>
              <p className="mb-3 text-sm text-gray-600">Choose how to pay:</p>
              <PaymentSummary
                items={[
                  { label: "Fare", amount: ride.fare ?? ride.estimatedFare?.maxFare ?? 0 },
                  ...(ride.estimatedFare?.distanceKm
                    ? [{ label: `Distance (${ride.estimatedFare.distanceKm.toFixed(1)} km)`, amount: 0 }]
                    : []),
                ]}
                total={ride.fare ?? ride.estimatedFare?.maxFare ?? 0}
                className="mb-4"
              />
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handlePayWithStripe}
                  disabled={paying}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 font-semibold text-gray-800 transition hover:border-uber-green hover:bg-uber-green/5 disabled:opacity-60"
                >
                  {paying ? "Redirecting…" : "Pay with card (Stripe)"}
                </button>
                <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowQr((v) => !v)}
                    className="w-full py-3 font-semibold text-gray-800"
                  >
                    {showQr ? "Hide QR code" : "Pay with QR / UPI"}
                  </button>
                  {showQr && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                      <p className="mb-2 text-center text-xs text-gray-600">Scan to pay via UPI</p>
                      <div className="mx-auto mb-2 flex justify-center rounded-lg bg-white p-2">
                        <QRCodeSVG
                          value={`upi://pay?pa=ridely@upi&pn=Ridely&am=${Math.round(ride.fare ?? ride.estimatedFare?.maxFare ?? 0)}&cu=INR`}
                          size={140}
                          level="M"
                          includeMargin
                        />
                      </div>
                      <p className="mb-2 text-center text-xs text-gray-500">Amount: ₹{Math.round(ride.fare ?? ride.estimatedFare?.maxFare ?? 0)}</p>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid("upi")}
                        disabled={!!markingPaid}
                        className="w-full rounded-lg bg-uber-green py-2.5 text-sm font-semibold text-white hover:bg-uber-green-dark disabled:opacity-60"
                      >
                        {markingPaid === "upi" ? "Marking…" : "I've paid with UPI"}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkPaid("cash")}
                  disabled={!!markingPaid}
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 font-semibold text-gray-800 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60"
                >
                  {markingPaid === "cash" ? "Marking…" : "I've paid with cash"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ride status
              </p>
              {(status === "accepted" || status === "driver_arriving") && ride.otp && (
                <div className="mb-4 rounded-xl border-2 border-uber-green/30 bg-uber-green/5 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Share with driver
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-[0.3em] text-uber-green-dark">
                    {ride.otp}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Give this OTP to your driver to start the trip
                  </p>
                </div>
              )}
              <RideStatusStepper currentStatus={status ?? "requested"} />
              {ride.eta && (
                <p className="mt-4 text-sm text-gray-600">
                  ETA: <span className="font-semibold text-gray-900">{ride.eta}</span>
                </p>
              )}
              {status === "in_progress" && (
                <p className="mt-3 text-xs text-gray-500">
                  When the driver completes the trip, you’ll pay here on this screen.
                </p>
              )}
              <div className="mt-5 flex gap-3">
                {canCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {cancelling ? "Cancelling…" : "Cancel ride"}
                  </button>
                )}
                <Link
                  href="/rider/dashboard"
                  className="flex flex-1 items-center justify-center rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Back
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
