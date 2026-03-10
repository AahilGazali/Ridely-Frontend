"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { MapView, type MapMarkerConfig } from "@/components/MapView";
import { RideBookingPanel } from "@/components/RideBookingPanel";
import { useAppStore } from "@/store/useAppStore";
import type { PlaceResult, RideType, LatLng, Ride } from "@/types";
import { setAuthToken, rideApi } from "@/lib/api";
import { getFareEstimateClient } from "@/lib/fare";

/** Generate stable mock positions for nearby drivers around the PICKUP only (like Ola/Uber). */
function getNearbyDriverMarkers(pickup: LatLng, rideType: RideType, count: number): MapMarkerConfig[] {
  const radiusKm = 0.012;
  const markers: MapMarkerConfig[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + i * 0.7;
    const lat = pickup.lat + (radiusKm * Math.cos(angle)) / 111;
    const lng = pickup.lng + (radiusKm * Math.sin(angle)) / (111 * Math.cos((pickup.lat * Math.PI) / 180));
    markers.push({
      id: `driver-${rideType}-${i}`,
      position: { lat, lng },
      type: "driver",
      vehicleType: rideType,
      title: `${rideType} nearby`,
    });
  }
  return markers;
}

export default function RiderDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const {
    pickup,
    drop,
    setPickup,
    setDrop,
    selectedRideType,
    setSelectedRideType,
    fareEstimatesByType,
    setFareEstimatesByType,
    clearFareEstimates,
    setCurrentRide,
    currentRide,
    addPendingRideRequest,
    addRiderCompletedRide,
  } = useAppStore();

  // Only when ride is completed AND paid: save to history and clear. Do not clear when completed but unpaid.
  useEffect(() => {
    if (currentRide?.status === "completed" && currentRide?.paymentStatus === "paid") {
      addRiderCompletedRide(currentRide);
      setPickup(null);
      setDrop(null);
      setCurrentRide(null);
    }
  }, [currentRide?.id, currentRide?.status, currentRide?.paymentStatus, addRiderCompletedRide, setPickup, setDrop, setCurrentRide]);

  // After payment success (Stripe or cash/UPI): clear "Pay now", refetch; if Stripe + rideId, go to review
  useEffect(() => {
    const paid = searchParams.get("paid");
    const stripeSuccess = searchParams.get("payment") === "success";
    const rideId = searchParams.get("rideId");
    if (stripeSuccess && rideId) {
      router.replace(`/rider/review?rideId=${rideId}`);
      return;
    }
    if (!paid && !stripeSuccess) return;
    if (stripeSuccess) toast.success("Payment successful. Thank you!");
    setUnpaidCompletedRide(null);
    window.history.replaceState({}, "", "/rider/dashboard");
    rideApi.getHistory("rider").then((res) => {
      const rides = (res.data?.rides ?? []) as Ride[];
      const unpaid = rides.find((r) => r.status === "completed" && r.paymentStatus !== "paid");
      setUnpaidCompletedRide(unpaid ?? null);
    }).catch(() => setUnpaidCompletedRide(null));
    if (currentRide?.id) {
      rideApi.getRide(currentRide.id).then((res) => {
        setCurrentRide(res.data.ride);
      }).catch(() => {});
    }
  }, [searchParams, currentRide?.id, setCurrentRide, router]);

  const refetchUnpaid = useCallback(() => {
    rideApi
      .getHistory("rider")
      .then((res) => {
        const rides = (res.data?.rides ?? []) as Ride[];
        const unpaid = rides.find((r) => r.status === "completed" && r.paymentStatus !== "paid");
        setUnpaidCompletedRide(unpaid ?? null);
      })
      .catch(() => setUnpaidCompletedRide(null));
  }, []);

  // When dashboard loads: fetch history so "Pay now" only shows for actually unpaid rides
  useEffect(() => {
    refetchUnpaid();
  }, [refetchUnpaid]);

  // Refetch when user returns to this tab so paid rides stop showing "Pay now"
  useEffect(() => {
    const onFocus = () => refetchUnpaid();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchUnpaid]);

  useEffect(() => {
    if (!currentRide?.id) return;
    rideApi
      .getRide(currentRide.id)
      .then((res) => {
        const ride = res.data.ride;
        setCurrentRide(ride);
      })
      .catch(() => {});
  }, [currentRide?.id, setCurrentRide]);

  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [selectingOnMap, setSelectingOnMap] = useState<null | "pickup" | "drop">(null);
  const [unpaidCompletedRide, setUnpaidCompletedRide] = useState<Ride | null>(null);

  // Compute fare estimates for all ride types on the client using actual distance
  useEffect(() => {
    if (!pickup || !drop) {
      clearFareEstimates();
      return;
    }
    setEstimating(true);
    const types: RideType[] = ["bike", "mini", "sedan", "auto"];
    const byType: Partial<Record<RideType, import("@/types").FareEstimate>> = {};
    types.forEach((rideType) => {
      byType[rideType] = getFareEstimateClient(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: drop.lat, lng: drop.lng },
        rideType
      );
    });
    setFareEstimatesByType(byType);
    setEstimating(false);
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, setFareEstimatesByType, clearFareEstimates]);

  const handleRequestRide = useCallback(async () => {
    if (!pickup || !drop) {
      toast.error("Please enter pickup and drop locations");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in again to request a ride.");
        return;
      }
      setAuthToken(token);
      const res = await rideApi.requestRide({
        pickup: {
          placeId: pickup.placeId,
          address: pickup.address,
          lat: pickup.lat,
          lng: pickup.lng,
        },
        drop: {
          placeId: drop.placeId,
          address: drop.address,
          lat: drop.lat,
          lng: drop.lng,
        },
        rideType: selectedRideType,
      });
      const ride = res.data.ride;
      setCurrentRide(ride);
      addPendingRideRequest(ride);
      toast.success("Ride requested!");
      router.push(`/rider/ride/${ride.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request ride. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [pickup, drop, selectedRideType, getToken, setCurrentRide, addPendingRideRequest, router]);

  const center =
    pickup && drop
      ? {
          lat: (pickup.lat + drop.lat) / 2,
          lng: (pickup.lng + drop.lng) / 2,
        }
      : pickup
        ? { lat: pickup.lat, lng: pickup.lng }
        : undefined;

  const baseDriverMarkers = useMemo(() => {
    if (!pickup) return [];
    return getNearbyDriverMarkers({ lat: pickup.lat, lng: pickup.lng }, selectedRideType, 6);
  }, [pickup?.lat, pickup?.lng, selectedRideType]);

  const [liveDriverMarkers, setLiveDriverMarkers] = useState<MapMarkerConfig[]>([]);
  const baseMarkersRef = useRef<MapMarkerConfig[]>([]);
  baseMarkersRef.current = baseDriverMarkers;

  useEffect(() => {
    setLiveDriverMarkers(baseDriverMarkers);
  }, [baseDriverMarkers]);

  useEffect(() => {
    if (baseDriverMarkers.length === 0) return;
    const tick = () => {
      const base = baseMarkersRef.current;
      setLiveDriverMarkers(
        base.map((m) => ({
          ...m,
          position: {
            lat: m.position.lat + (Math.random() - 0.5) * 0.0002,
            lng: m.position.lng + (Math.random() - 0.5) * 0.0002,
          },
        }))
      );
    };
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [baseDriverMarkers.length]);

  const nearbyDriverMarkers = baseDriverMarkers.length > 0 ? liveDriverMarkers : [];

  const hasActiveRide =
    currentRide &&
    currentRide.status !== "completed" &&
    currentRide.status !== "cancelled";

  const rideNeedsPayment =
    (currentRide && currentRide.status === "completed" && currentRide.paymentStatus !== "paid") ||
    unpaidCompletedRide;
  const payRide = rideNeedsPayment ? (currentRide?.status === "completed" && currentRide?.paymentStatus !== "paid" ? currentRide : unpaidCompletedRide!) : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      {/* Trip completed — Pay now: show when driver completed but rider hasn't paid */}
      {payRide && (
        <div className="order-0 w-full border-b border-amber-200 bg-amber-50 px-4 py-3 md:px-5">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">Trip completed — Pay now</p>
              <p className="truncate text-sm text-gray-700">
                {payRide.pickup?.address ?? "Pickup"} → {payRide.drop?.address ?? "Drop"}
              </p>
            </div>
            <Link
              href={`/rider/ride/${payRide.id}`}
              className="shrink-0 rounded-xl bg-uber-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-uber-green-dark"
            >
              Pay now
            </Link>
          </div>
        </div>
      )}
      {/* Active ride banner – in-progress ride (not yet completed) */}
      {hasActiveRide && !payRide && (
        <div className="order-0 w-full border-b border-uber-green/30 bg-uber-green/10 px-4 py-3 md:px-5">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-uber-green-dark">Active ride</p>
              <p className="truncate text-sm text-gray-700">
                {currentRide!.pickup.address} → {currentRide!.drop.address}
              </p>
            </div>
            <Link
              href={`/rider/ride/${currentRide!.id}`}
              className="shrink-0 rounded-xl bg-uber-green px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-uber-green-dark"
            >
              View ride
            </Link>
          </div>
        </div>
      )}

      {/* Map: on mobile shows first (top ~40%), on desktop takes remaining space */}
      <div className="relative order-2 min-h-[38vh] flex-1 md:order-2 md:min-h-0">
        <MapView
          center={center}
          pickup={pickup ?? undefined}
          drop={drop ?? undefined}
          markers={nearbyDriverMarkers}
          showMyLocation
          pickupMarkerDraggable={selectingOnMap === "pickup"}
          onPickupDragEnd={(latLng) => {
            if (!pickup) return;
            setPickup({
              ...pickup,
              lat: latLng.lat,
              lng: latLng.lng,
            });
          }}
          dropMarkerDraggable={selectingOnMap === "drop"}
          onDropDragEnd={(latLng) => {
            if (!drop) return;
            setDrop({
              ...drop,
              lat: latLng.lat,
              lng: latLng.lng,
            });
          }}
          onClick={(coords: LatLng) => {
            if (!selectingOnMap) return;
            const label = selectingOnMap === "pickup" ? "Pinned pickup location" : "Pinned drop location";
            const place: PlaceResult = {
              placeId: `manual-${selectingOnMap}-${Date.now()}`,
              address: label,
              lat: coords.lat,
              lng: coords.lng,
            };
            if (selectingOnMap === "pickup") {
              setPickup(place);
            } else {
              setDrop(place);
            }
            // Keep selectingOnMap so user can drag pin, then confirm
          }}
          className="absolute inset-0"
        />
        {selectingOnMap && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3">
            <div className="rounded-xl bg-black/80 px-3 py-2 text-center text-sm font-medium text-white">
              {pickup && selectingOnMap === "pickup"
                ? "Drag the pin to adjust, then confirm"
                : drop && selectingOnMap === "drop"
                  ? "Drag the pin to adjust, then confirm"
                  : `Tap on the map to set ${selectingOnMap === "pickup" ? "pickup" : "drop"} location`}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectingOnMap(null);
                  toast.success("Cancelled");
                }}
                className="flex-1 rounded-xl border border-white/40 bg-white/20 py-2.5 text-sm font-semibold text-white backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectingOnMap === "pickup" && pickup) {
                    setSelectingOnMap(null);
                    toast.success("Pickup location confirmed");
                  } else if (selectingOnMap === "drop" && drop) {
                    setSelectingOnMap(null);
                    toast.success("Drop location confirmed");
                  } else {
                    toast.error("Tap the map first to place the pin");
                  }
                }}
                className="flex-1 rounded-xl bg-uber-green py-2.5 text-sm font-semibold text-black"
              >
                Confirm location
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Booking panel: on mobile below map (scrollable), on desktop left sidebar */}
      <aside className="order-1 flex w-full shrink-0 flex-col border-b border-gray-200 bg-white md:order-1 md:h-full md:max-h-[calc(100vh-3.5rem)] md:w-[420px] md:min-w-[360px] md:border-b-0 md:border-r md:shadow-[4px_0_24px_rgba(0,0,0,0.06)]">
        <div className="border-b border-gray-100 px-4 py-3 md:py-4">
          <h2 className="text-lg font-semibold text-gray-900">Book a ride</h2>
          <p className="mt-0.5 text-sm text-gray-500">Enter pickup and destination</p>
        </div>
        <RideBookingPanel
          embedded
          pickup={pickup}
          drop={drop}
          onPickupSelect={setPickup}
          onDropSelect={setDrop}
          onPickupMapSelect={() => setSelectingOnMap("pickup")}
          onDropMapSelect={() => setSelectingOnMap("drop")}
          selectedRideType={selectedRideType}
          onRideTypeSelect={setSelectedRideType}
          fareEstimatesByType={fareEstimatesByType}
          estimating={estimating}
          onRequestRide={handleRequestRide}
          requestLoading={loading}
        />
      </aside>
    </div>
  );
}
