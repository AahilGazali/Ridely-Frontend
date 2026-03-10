"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Rehydrate persisted store from localStorage after client mount.
 * Required when using persist with skipHydration in Next.js.
 */
export function StoreHydrator() {
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);
  return null;
}
