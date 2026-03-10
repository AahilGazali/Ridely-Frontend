"use client";

import type { RideStatus } from "@/types";

const RIDER_STEPS: { status: RideStatus; label: string; short: string }[] = [
  { status: "requested", label: "Requested", short: "Requested" },
  { status: "accepted", label: "Accepted", short: "Accepted" },
  { status: "driver_arriving", label: "Driver arriving", short: "Arriving" },
  { status: "in_progress", label: "On trip", short: "On trip" },
  { status: "completed", label: "Completed", short: "Done" },
];

/** Driver sees only their steps: Accepted → Going to pickup → On trip → Done */
const DRIVER_STEPS: { status: RideStatus; label: string; short: string }[] = [
  { status: "accepted", label: "Accepted", short: "Accepted" },
  { status: "driver_arriving", label: "Going to pickup", short: "Arriving" },
  { status: "in_progress", label: "On trip", short: "On trip" },
  { status: "completed", label: "Done", short: "Done" },
];

interface RideStatusStepperProps {
  currentStatus: RideStatus;
  /** "rider" = 5 steps (requested→done), "driver" = 4 steps (accepted→done) */
  variant?: "rider" | "driver";
  className?: string;
}

export function RideStatusStepper({
  currentStatus,
  variant = "rider",
  className = "",
}: RideStatusStepperProps) {
  const STEPS = variant === "driver" ? DRIVER_STEPS : RIDER_STEPS;
  const currentIndex = STEPS.findIndex((s) => s.status === currentStatus);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isActive = i <= safeIndex;
          const isCurrent = i === safeIndex;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={step.status} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center justify-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? "bg-uber-green text-white shadow-md"
                      : "bg-gray-200 text-gray-500"
                  } ${isCurrent ? "ring-4 ring-uber-green/30" : ""}`}
                >
                  {i + 1}
                </div>
                {!isLast && (
                  <div
                    className={`h-1 flex-1 min-w-2 max-w-8 rounded-full sm:max-w-12 ${
                      i < safeIndex ? "bg-uber-green" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-2 max-w-[4rem] text-center text-xs font-medium leading-tight ${
                  isCurrent ? "text-gray-900" : isActive ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {step.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
