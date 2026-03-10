"use client";

import { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/formatCurrency";
import { useAppStore } from "@/store/useAppStore";
import { rideApi } from "@/lib/api";
import type { Ride } from "@/types";

interface DaySummary {
  day: string;
  trips: number;
  earnings: number;
}

function mergeCompletedRides(apiRides: Ride[], fromStore: Ride[]): Ride[] {
  const byId = new Map<string, Ride>();
  for (const r of fromStore) {
    if (r.status === "completed") byId.set(r.id, r);
  }
  for (const r of apiRides) {
    if (r.status === "completed") byId.set(r.id, r);
  }
  return Array.from(byId.values());
}

export default function DriverEarningsPage() {
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

  const summaries = useMemo<DaySummary[]>(() => {
    const byDay = new Map<string, { day: string; trips: number; earnings: number; sortKey: number }>();
    for (const ride of rides) {
      const fare = ride.fare ?? ride.estimatedFare?.maxFare ?? 0;
      const date = ride.completedAt || ride.requestedAt;
      const d = new Date(date);
      const key = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      const existing = byDay.get(key) ?? { day: key, trips: 0, earnings: 0, sortKey: d.getTime() };
      existing.trips += 1;
      existing.earnings += fare;
      byDay.set(key, existing);
    }
    return Array.from(byDay.values())
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(({ day, trips, earnings }) => ({ day, trips, earnings }));
  }, [rides]);

  const totalTrips = rides.length;
  const totalEarnings = summaries.reduce((sum, d) => sum + d.earnings, 0);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold text-black">Earnings</h1>
      <p className="mt-1 text-sm text-gray-600">Based on your completed rides</p>

      <div className="mt-6 rounded-2xl bg-uber-green/10 p-6">
        <p className="text-sm font-medium text-gray-600">Total earnings</p>
        <p className="text-3xl font-bold text-uber-green-dark">
          {formatINR(totalEarnings)}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {totalTrips} trip{totalTrips === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">By day</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading earnings…</p>
        ) : summaries.length === 0 ? (
          <p className="text-sm text-gray-500">No completed rides yet.</p>
        ) : (
          summaries.map((d) => (
            <div
              key={d.day}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <span className="font-medium">{d.day}</span>
              <span className="text-gray-600">{d.trips} trips</span>
              <span className="font-semibold text-uber-green-dark">
                {formatINR(d.earnings)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
