"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { PaymentSummary } from "@/components/PaymentSummary";
import { formatINR } from "@/lib/formatCurrency";
import { useAppStore } from "@/store/useAppStore";
import { rideApi, paymentApi, setAuthToken } from "@/lib/api";
import type { Ride } from "@/types";

const MOCK_CARDS = [
  { id: "1", last4: "4242", brand: "Visa", isDefault: true },
  { id: "2", last4: "5555", brand: "Mastercard", isDefault: false },
];

function mergeCompletedRides(apiRides: Ride[], fromStore: Ride[]): Ride[] {
  const byId = new Map<string, Ride>();
  for (const r of fromStore) if (r.status === "completed") byId.set(r.id, r);
  for (const r of apiRides) if (r.status === "completed") byId.set(r.id, r);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.completedAt || b.requestedAt).getTime() - new Date(a.completedAt || a.requestedAt).getTime()
  );
}

export default function RiderPaymentPage() {
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { riderCompletedRides } = useAppStore();
  const [apiRides, setApiRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingRideId, setPayingRideId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState(MOCK_CARDS[0].id);

  // Handle Stripe return: ?success=true or ?canceled=true
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "true") {
      toast.success("Payment successful. Thank you!");
      window.history.replaceState({}, "", "/rider/payment");
    }
    if (canceled === "true") {
      toast("Payment canceled. You can pay anytime from this page.");
      window.history.replaceState({}, "", "/rider/payment");
    }
  }, [searchParams]);

  useEffect(() => {
    rideApi.getHistory("rider").then((res) => setApiRides(res.data.rides || [])).catch(() => setApiRides([])).finally(() => setLoading(false));
  }, []);

  const rides = mergeCompletedRides(apiRides, riderCompletedRides);
  const totalEarnings = rides.reduce((sum, r) => sum + (r.fare ?? r.estimatedFare?.maxFare ?? 0), 0);
  const lastRide = rides[0];

  const handlePayWithStripe = useCallback(
    async (ride: Ride) => {
      const rideId = ride.id;
      setPayingRideId(rideId);
      try {
        const token = await getToken();
        if (!token) {
          toast.error("Please sign in to pay.");
          return;
        }
        setAuthToken(token);
        const res = await paymentApi.createCheckoutSession(rideId);
        const url = res.data?.url;
        if (url) {
          window.location.href = url;
          return;
        }
        toast.error("Could not start checkout.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Payment failed. Try again.");
      } finally {
        setPayingRideId(null);
      }
    },
    [getToken]
  );

  const handlePay = () => {
    toast.success("Payment method updated");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-black">Payment</h1>
      <p className="mt-1 text-sm text-gray-600">Manage payment methods & view trip payments</p>

      {/* Real-time summary from completed rides */}
      <section className="mt-6 rounded-2xl bg-uber-green/10 p-5">
        <h2 className="text-sm font-semibold text-uber-green-dark">Your trips</h2>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatINR(totalEarnings)}</p>
        <p className="mt-0.5 text-sm text-gray-600">
          {rides.length} completed trip{rides.length === 1 ? "" : "s"}
        </p>
      </section>

      {lastRide && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-gray-700">Last ride</h2>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-800">
              {lastRide.pickup.address} → {lastRide.drop.address}
            </p>
            <PaymentSummary
              items={[
                { label: "Fare", amount: lastRide.fare ?? lastRide.estimatedFare?.maxFare ?? 0 },
                ...(lastRide.estimatedFare?.distanceKm
                  ? [{ label: `Distance (${lastRide.estimatedFare.distanceKm.toFixed(1)} km)`, amount: 0 }]
                  : []),
              ]}
              total={lastRide.fare ?? lastRide.estimatedFare?.maxFare ?? 0}
              className="mt-3"
            />
            {lastRide.paymentStatus !== "paid" && (
              <button
                type="button"
                disabled={!!payingRideId}
                onClick={() => handlePayWithStripe(lastRide)}
                className="mt-4 w-full rounded-xl bg-uber-green py-3 font-semibold text-white hover:bg-uber-green-dark disabled:opacity-60"
              >
                {payingRideId === lastRide.id ? "Redirecting to Stripe…" : "Pay with card (Stripe)"}
              </button>
            )}
            {lastRide.paymentStatus === "paid" && (
              <p className="mt-3 text-sm font-medium text-uber-green">Paid</p>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-700">Payment method</h2>
        <div className="mt-2 space-y-2">
          {MOCK_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCard(card.id)}
              className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left ${
                selectedCard === card.id ? "border-uber-green bg-uber-green/5" : "border-gray-200 bg-white"
              }`}
            >
              <span className="font-medium">
                {card.brand} •••• {card.last4}
              </span>
              {card.isDefault && <span className="text-xs text-gray-500">Default</span>}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          + Add payment method
        </button>
      </section>

      <button
        type="button"
        onClick={handlePay}
        className="mt-8 w-full rounded-xl bg-black py-4 font-semibold text-white hover:bg-gray-800"
      >
        Save payment method
      </button>
    </div>
  );
}
