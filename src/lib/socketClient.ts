"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ServerToClientEvents = {
  rideRequested: { rideId: string; ride: unknown };
  rideAccepted: { rideId: string; ride: unknown };
  rideStarted: { rideId: string; ride: unknown };
  rideCompleted: { rideId: string; ride: unknown };
  driverLocationUpdate: { driverId: string; lat: number; lng: number; rideId?: string };
  SOSAlert: { rideId: string; alert: unknown; ride: unknown };
};

type ClientToServerEvents = Record<string, never>;

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api$/, "")
    : "http://localhost:3001");

export function getSocket(): AppSocket | null {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });
  }
  return socket;
}

/** Hook for React: current realtime connection status. */
export function useSocketStatus(): { connected: boolean } {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    setConnected(s.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  return { connected };
}

