"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { RatingModal } from "@/components/RatingModal";
import { reviewApi } from "@/lib/api";

export default function RiderReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rideId = searchParams.get("rideId") ?? "";
  const [modalOpen, setModalOpen] = useState(!!rideId);

  const handleSubmit = (rating: number, feedback?: string) => {
    if (!rideId) return;
    reviewApi
      .createReview(rideId, rating, feedback)
      .then(() => {
        toast.success("Thanks for your feedback!");
        setModalOpen(false);
        if (rideId) router.replace("/rider/dashboard");
      })
      .catch((err: Error) => {
        const msg = err?.message || "";
        toast.error(msg.includes("already reviewed") ? "You already reviewed this ride." : "Could not submit review. Try again.");
      });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-black">Review your ride</h1>
      <p className="mt-1 text-sm text-gray-600">How was your trip?</p>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-uber-green px-6 py-3 font-medium text-white hover:bg-uber-green-dark"
        >
          Rate a ride
        </button>
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/rider/dashboard" className="text-uber-green hover:underline">
          Back to dashboard
        </Link>
      </div>

      <RatingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        rideId={rideId}
      />
    </div>
  );
}
