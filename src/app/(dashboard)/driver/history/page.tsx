"use client";

import { useEffect, useState } from "react";
import { RideRequestCard } from "@/components/RideRequestCard";
import { RideCardSkeleton } from "@/components/LoadingSkeleton";
import { formatINR } from "@/lib/formatCurrency";
import { useAppStore } from "@/store/useAppStore";
import { rideApi } from "@/lib/api";
import type { Ride } from "@/types";

function mergeCompletedRides(apiRides: Ride[], fromStore: Ride[]): Ride[] {
  const byId = new Map<string, Ride>();
  for (const r of fromStore) {
    if (r.status === "completed") byId.set(r.id, r);
  }
  for (const r of apiRides) {
    if (r.status === "completed") byId.set(r.id, r);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.completedAt || b.requestedAt).getTime() - new Date(a.completedAt || a.requestedAt).getTime()
  );
}

export default function DriverHistoryPage() {
  const { driverCompletedRides } = useAppStore();
  const [apiRides, setApiRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rideApi
      .getHistory("driver")
      .then((res) => setApiRides(res.data.rides || []))
      .catch(() => setApiRides([]))
      .finally(() => setLoading(false));
  }, []);

  const rides = mergeCompletedRides(apiRides, driverCompletedRides);
  const totalEarnings = rides.reduce((sum, r) => sum + (r.fare ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Ride history
        </h1>
        <p className="mt-1 text-sm text-gray-500">Your completed rides</p>
        {rides.length > 0 && (
          <div className="mt-3 rounded-xl border border-uber-green/30 bg-uber-green/5 px-4 py-3">
            <p className="text-sm font-medium text-gray-600">Total earnings</p>
            <p className="text-xl font-bold text-uber-green-dark">{formatINR(totalEarnings)}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <RideCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="ride-list max-h-[70vh] space-y-4 overflow-y-auto">
          {rides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">
              No rides yet
            </div>
          ) : (
            rides.map((ride) => (
              <RideRequestCard key={ride.id} ride={ride} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
