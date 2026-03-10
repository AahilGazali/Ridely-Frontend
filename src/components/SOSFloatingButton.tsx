"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SOSFloatingButtonProps {
  onConfirm?: () => void;
  className?: string;
}

/**
 * Floating SOS button with confirmation modal. Styled for high visibility.
 */
export function SOSFloatingButton({
  onConfirm,
  className = "",
}: SOSFloatingButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm?.();
    setOpen(false);
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-44 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-400/50 md:bottom-8 md:right-6 ${className}`}
        whileTap={{ scale: 0.95 }}
        aria-label="Emergency SOS"
      >
        <span className="text-sm font-bold tracking-wide">SOS</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-[20rem] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
              >
                <h3 className="text-base font-bold text-red-600">
                  Emergency SOS
                </h3>
                <p className="mt-1.5 text-sm text-gray-600">
                  Are you in danger? This will share your location and alert
                  emergency services.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
                  >
                    Yes, call for help
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
