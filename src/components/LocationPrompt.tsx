"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "ridely_location_prompt_dismissed";
const PERMISSION_GRANTED_EVENT = "locationPermissionGranted";

export function LocationPrompt() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed === "true") return;
    setVisible(true);
  }, []);

  const handleEnable = () => {
    if (!navigator.geolocation) return;
    setRequesting(true);
    setError(null);
    // Clear any previous timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setRequesting(false);
    }, 15000);

    const onSuccess = (position: GeolocationPosition) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      sessionStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
      setRequesting(false);
      setError(null);
      // Notify map to show user location (it may have failed earlier due to no permission)
      window.dispatchEvent(new CustomEvent(PERMISSION_GRANTED_EVENT, { detail: position }));
    };

    const onError = (err: GeolocationPositionError) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setRequesting(false);
      if (err.code === 1) {
        setError("Location was blocked. Allow access in your browser settings to enable.");
      } else {
        setError(err.message || "Could not get location. Try again.");
      }
    };

    // maximumAge: 0 forces a fresh read and helps trigger the browser permission prompt
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  };

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-uber-green/10 border-b border-uber-green/20 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">
            Allow location access to see your position on the map and get accurate pickups.
          </p>
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={requesting}
            className="rounded-lg bg-uber-green px-4 py-2 text-sm font-semibold text-white hover:bg-uber-green-dark disabled:opacity-70"
          >
            {requesting ? "Requesting…" : "Enable location"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={requesting}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-70"
            aria-label="Dismiss"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
