"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RatingStars } from "./RatingStars";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback?: string) => void;
  rideId?: string;
}

export function RatingModal({
  open,
  onClose,
  onSubmit,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, feedback.trim() || undefined);
      setRating(0);
      setFeedback("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900">
              How was your ride?
            </h3>
            <div className="mt-3 flex justify-center">
              <RatingStars value={rating} onChange={setRating} size="lg" />
            </div>
            <textarea
              placeholder="Optional feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-uber-green focus:outline-none focus:ring-2 focus:ring-uber-green/20"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={rating === 0}
                className="flex-1 rounded-xl bg-uber-green py-2.5 text-sm font-medium text-white hover:bg-uber-green-dark disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
