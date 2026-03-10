"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAppStore } from "@/store/useAppStore";
import { setAuthToken } from "@/lib/api";

/**
 * When the signed-in user changes (different account), clear history and
 * booking data so Payment and History show only the current account's data.
 * Also sets the Clerk JWT on the API client for authenticated backend requests.
 */
export function AuthSync() {
  const { userId, getToken } = useAuth();
  const lastKnownUserId = useAppStore((s) => s.lastKnownUserId);
  const setLastKnownUserId = useAppStore((s) => s.setLastKnownUserId);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const clearUserSpecificData = useAppStore((s) => s.clearUserSpecificData);

  useEffect(() => {
    if (!userId) {
      setAuthToken(null);
      setLastKnownUserId(null);
      setCurrentUser(null);
      clearUserSpecificData();
      return;
    }
    if (lastKnownUserId !== null && lastKnownUserId !== userId) {
      clearUserSpecificData();
    }
    setLastKnownUserId(userId);
    setCurrentUser({ id: userId, role: "rider" });
  }, [userId, lastKnownUserId, setLastKnownUserId, setCurrentUser, clearUserSpecificData]);

  // Keep API client auth token in sync with Clerk session
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getToken()
      .then((token) => {
        if (!cancelled) setAuthToken(token);
      })
      .catch(() => {
        if (!cancelled) setAuthToken(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, getToken]);

  return null;
}
