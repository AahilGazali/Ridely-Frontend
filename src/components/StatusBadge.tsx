"use client";

import type { RideStatus } from "@/types";

const STATUS_CONFIG: Record<
  RideStatus,
  { label: string; className: string }
> = {
  requested: { label: "Requested", className: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", className: "bg-blue-100 text-blue-800" },
  driver_arriving: {
    label: "Driver arriving",
    className: "bg-indigo-100 text-indigo-800",
  },
  in_progress: { label: "On trip", className: "bg-uber-green/20 text-uber-green-dark" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

interface StatusBadgeProps {
  status: RideStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
