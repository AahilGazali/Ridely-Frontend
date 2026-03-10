"use client";

import { useSocketStatus } from "@/lib/socketClient";

export function RealtimeIndicator() {
  const { connected } = useSocketStatus();

  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      title={connected ? "Realtime updates connected" : "Reconnecting…"}
      aria-live="polite"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
        }`}
      />
      {connected ? (
        <span className="text-emerald-700">Live</span>
      ) : (
        <span className="text-amber-700">Connecting…</span>
      )}
    </span>
  );
}
