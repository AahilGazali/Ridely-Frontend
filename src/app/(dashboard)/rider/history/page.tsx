"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function RiderHistoryPage() {
  const { riderCompletedRides } = useAppStore();
  const [apiRides, setApiRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  useEffect(() => {
    rideApi
      .getHistory("rider")
      .then((res) => setApiRides(res.data.rides || []))
      .catch(() => setApiRides([]))
      .finally(() => setLoading(false));
  }, []);

  const rides = mergeCompletedRides(apiRides, riderCompletedRides);

  const handleDownloadReceipt = (ride: Ride) => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(16);
      doc.text("Ride Receipt", 14, y);
      y += 10;
      doc.setFontSize(10);
      doc.text(`Ride ID: ${ride.id.slice(0, 8)}...`, 14, y);
      y += 7;
      doc.text("From:", 14, y);
      const fromLines = doc.splitTextToSize(ride.pickup.address || "—", 170);
      doc.text(fromLines.slice(0, 3), 14, y + 5);
      y += 5 + Math.min(fromLines.length, 3) * 5.5;
      doc.text("To:", 14, y);
      const toLines = doc.splitTextToSize(ride.drop.address || "—", 170);
      doc.text(toLines.slice(0, 3), 14, y + 5);
      y += 5 + Math.min(toLines.length, 3) * 5.5 + 5;
      doc.setFont("helvetica", "bold");
      doc.text(`Fare: ${formatINR(ride.fare ?? 0)}`, 14, y);
      doc.setFont("helvetica", "normal");
      y += 7;
      doc.text(`Date: ${new Date(ride.requestedAt).toLocaleString()}`, 14, y);
      doc.save(`receipt-${ride.id.slice(0, 8)}.pdf`);
    }).catch(() => {
      const text = [
        `Ride Receipt - ${ride.id}`,
        `From: ${ride.pickup.address}`,
        `To: ${ride.drop.address}`,
        `Fare: ${formatINR(ride.fare ?? 0)}`,
        `Date: ${new Date(ride.requestedAt).toLocaleString()}`,
      ].join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${ride.id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Ride history
        </h1>
        <p className="mt-1 text-sm text-gray-500">Your past rides</p>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
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
              <RideRequestCard
                key={ride.id}
                ride={ride}
                onClick={() => setSelectedRide(ride)}
              />
            ))
          )}
        </div>
      )}

      {/* Ride details modal – centered, compact */}
      {selectedRide && (
        <>
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedRide(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Ride details"
            >
              <h3 className="text-base font-semibold text-gray-900">Ride details</h3>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600" title={selectedRide.pickup.address}>
                {selectedRide.pickup.address}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-gray-600" title={selectedRide.drop.address}>
                → {selectedRide.drop.address}
              </p>
              <p className="mt-2 text-sm">
                Fare: <strong>{formatINR(selectedRide.fare ?? 0)}</strong>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/rider/review?rideId=${selectedRide.id}`}
                  className="min-w-0 flex-1 rounded-xl bg-uber-green py-2.5 text-center text-sm font-medium text-white hover:bg-uber-green-dark"
                >
                  Rate this ride
                </Link>
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(selectedRide)}
                  className="min-w-0 flex-1 rounded-xl border-2 border-uber-green py-2.5 text-sm font-medium text-uber-green hover:bg-uber-green/5"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRide(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
