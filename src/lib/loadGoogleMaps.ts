/**
 * Load Google Maps JS API once per page. Prevents "Element already defined" errors
 * from loading the script multiple times (e.g. on route change or remount).
 * Script is never removed so custom elements are only registered once.
 */

let cached: Promise<typeof google> | null = null;

function getLoadPromise(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window undefined"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (cached) return cached;
  const existing = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existing) {
    cached = new Promise<typeof google>((resolve) => {
      const check = () => {
        if (window.google?.maps) {
          resolve(window.google);
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
    return cached;
  }
  cached = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Google Maps failed to load"));
    };
    script.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(script);
  });
  return cached;
}

/**
 * Ensure Google Maps is loaded. Call once before using map or places.
 * Script is never removed so it is only ever loaded once.
 */
export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  return getLoadPromise(apiKey);
}
