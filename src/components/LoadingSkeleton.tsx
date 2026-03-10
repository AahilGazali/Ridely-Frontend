"use client";

export function RideCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton mt-2 h-4 w-1/2 rounded" />
      <div className="mt-3 flex justify-between">
        <div className="skeleton h-6 w-16 rounded" />
        <div className="skeleton h-8 w-24 rounded" />
      </div>
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="skeleton h-24 w-full rounded-xl" />
      <div className="skeleton h-12 w-2/3 rounded-xl" />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="map-container flex items-center justify-center bg-gray-200">
      <div className="skeleton h-full w-full rounded-none" />
    </div>
  );
}
