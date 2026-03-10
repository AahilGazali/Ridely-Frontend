"use client";

/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import type { LatLng, RideType } from "@/types";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";

const DEFAULT_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_ZOOM = 14;

/** Duration in ms for smooth driver marker movement */
const DRIVER_ANIMATION_DURATION = 1500;

/** Colors matching CHOOSE RIDE TYPE cards: Bike/Mini red-style, Sedan blue, Auto yellow-green */
const VEHICLE_COLOR: Record<RideType, string> = {
  bike: "#dc2626",
  mini: "#dc2626",
  sedan: "#2563eb",
  auto: "#eab308",
};

const AUTO_ACCENT = "#16a34a";

const ICON_SIZE = 48;
/** Driver/vehicle marker icon size (PNG from /assets/icons) */
const DRIVER_ICON_SIZE = 35;
const STROKE = "#fff";
const STROKE_W = 1.5;

/** PNG icon filename per vehicle type (from /assets/icons, 35x35) */
const VEHICLE_ICON_FILE: Record<RideType, string> = {
  bike: "bike.png",
  mini: "car.png",
  sedan: "car.png",
  auto: "auto.png",
};

/** Base path for vehicle PNG icons (Next.js public folder) */
const ASSETS_ICONS_BASE = "/assets/icons";

/** Returns PNG icon URL for driver markers; fallback to SVG if PNG not available */
function getVehicleIconUrl(vehicleType: RideType): string {
  const filename = VEHICLE_ICON_FILE[vehicleType];
  return `${ASSETS_ICONS_BASE}/${filename}`;
}

/** Fallback SVG data URL when PNG is missing – top-down vehicle shapes */
function getVehicleIconFallbackSvg(vehicleType: RideType): string {
  let svg: string;
  switch (vehicleType) {
    case "bike": {
      const c = VEHICLE_COLOR.bike;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><circle cx="10" cy="26" r="6" fill="${c}" stroke="${STROKE}" stroke-width="${STROKE_W}"/><circle cx="26" cy="26" r="6" fill="${c}" stroke="${STROKE}" stroke-width="${STROKE_W}"/><ellipse cx="18" cy="18" rx="8" ry="4" fill="${c}" stroke="${STROKE}" stroke-width="${STROKE_W}"/></svg>`;
      break;
    }
    case "mini":
    case "sedan": {
      const c = vehicleType === "sedan" ? VEHICLE_COLOR.sedan : VEHICLE_COLOR.mini;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><circle cx="10" cy="28" r="5" fill="${c}" stroke="${STROKE}" stroke-width="${STROKE_W}"/><circle cx="26" cy="28" r="5" fill="${c}" stroke="${STROKE}" stroke-width="${STROKE_W}"/><rect x="4" y="8" width="28" height="16" rx="4" fill="${c}" stroke="${STROKE}" stroke-width="${STROKE_W}"/><rect x="12" y="10" width="12" height="8" rx="1" fill="${STROKE}" opacity="0.85"/></svg>`;
      break;
    }
    case "auto": {
      const g = AUTO_ACCENT;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><circle cx="8" cy="28" r="4" fill="${VEHICLE_COLOR.auto}" stroke="${STROKE}" stroke-width="1"/><circle cx="18" cy="28" r="4" fill="${VEHICLE_COLOR.auto}" stroke="${STROKE}" stroke-width="1"/><circle cx="28" cy="28" r="4" fill="${VEHICLE_COLOR.auto}" stroke="${STROKE}" stroke-width="1"/><path fill="${g}" stroke="${STROKE}" stroke-width="${STROKE_W}" d="M6 14 L18 6 L30 14 L30 22 L6 22 Z"/><rect x="14" y="10" width="8" height="8" rx="1" fill="${STROKE}" opacity="0.85"/></svg>`;
      break;
    }
    default:
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><circle cx="10" cy="28" r="5" fill="${VEHICLE_COLOR.mini}" stroke="${STROKE}"/><circle cx="26" cy="28" r="5" fill="${VEHICLE_COLOR.mini}" stroke="${STROKE}"/><rect x="4" y="8" width="28" height="16" rx="4" fill="${VEHICLE_COLOR.mini}" stroke="${STROKE}" stroke-width="${STROKE_W}"/></svg>`;
  }
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Pickup (start) pin – use your uploaded image from /assets/icons */
function getPickupPinIconUrl(): string {
  return `${ASSETS_ICONS_BASE}/pin-start.png`;
}

/** Drop (stop) pin – use your uploaded image from /assets/icons */
function getDropPinIconUrl(): string {
  return `${ASSETS_ICONS_BASE}/pin-stop.png`;
}

/** Custom marker config for extensibility */
export interface MapMarkerConfig {
  id: string;
  position: LatLng;
  title?: string;
  /** "pickup" | "drop" | "driver" use built-in styles; otherwise custom icon */
  type?: "pickup" | "drop" | "driver" | "custom";
  /** When set with type "driver", use this vehicle's icon/color on the map */
  vehicleType?: RideType;
  icon?: google.maps.Symbol | google.maps.Icon;
}

export interface MapViewProps {
  /** Map center (optional; auto-derived from bounds if not set) */
  center?: LatLng;
  zoom?: number;
  /** Pickup location – draws green marker */
  pickup?: LatLng | null;
  /** Drop location – draws black marker */
  drop?: LatLng | null;
  /** Driver current position – draws vehicle marker; animate when this changes */
  driverLocation?: LatLng | null;
  /** Vehicle type for the driver marker (e.g. booked ride: auto, bike, car); if set, shows that icon instead of arrow */
  driverVehicleType?: RideType | null;
  /** Smoothly animate driver marker when driverLocation changes */
  animateDriver?: boolean;
  /** Show route from pickup to drop via Directions API */
  showRoute?: boolean;
  /** Optional route as polyline points (e.g. from backend). If set, drawn instead of Directions when showRoute is true and path has points */
  routePath?: LatLng[] | null;
  /** Fit map bounds to include pickup, drop, and driver with padding */
  fitBounds?: boolean;
  /** Show user's current location (blue dot) and center map on it when no pickup/drop */
  showMyLocation?: boolean;
  /** Extra custom markers */
  markers?: MapMarkerConfig[];
  /** Optional: handle user clicking on the map (used for set-on-map UX) */
  onClick?: (latLng: LatLng) => void;
  /** When true, pickup marker is draggable; on drag end this is called with new position */
  pickupMarkerDraggable?: boolean;
  onPickupDragEnd?: (latLng: LatLng) => void;
  /** When true, drop marker is draggable; on drag end this is called with new position */
  dropMarkerDraggable?: boolean;
  onDropDragEnd?: (latLng: LatLng) => void;
  /** Called when the route (Directions) has been loaded, with the path points for animation */
  onRouteReady?: (path: LatLng[]) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable Google Map: pickup/drop markers, route polyline (Directions or path),
 * live driver marker with optional smooth movement animation.
 */
export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  pickup = null,
  drop = null,
  driverLocation = null,
  driverVehicleType = null,
  animateDriver = true,
  showRoute = false,
  routePath = null,
  fitBounds = true,
  showMyLocation = false,
  markers: customMarkers = [],
  onClick,
  pickupMarkerDraggable = false,
  onPickupDragEnd,
  dropMarkerDraggable = false,
  onDropDragEnd,
  onRouteReady,
  className = "",
  children,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  /** When a PNG is missing, we use SVG fallback for that vehicle type */
  const [pngLoaded, setPngLoaded] = useState<Record<RideType, boolean>>({
    bike: false,
    mini: false,
    sedan: false,
    auto: false,
  });

  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropMarkerRef = useRef<google.maps.Marker | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const myLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const customMarkersRef = useRef<google.maps.Marker[]>([]);
  /** Driver markers by id for smooth position animation */
  const driverMarkersMapRef = useRef<Map<string, { marker: google.maps.Marker; current: LatLng; target: LatLng }>>(new Map());
  const driverAnimationLoopRef = useRef<number | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const driverAnimationRef = useRef<number | null>(null);
  const lastDriverPosRef = useRef<LatLng | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const userHasInteractedRef = useRef(false);
  const lastAppliedBoundsKeyRef = useRef<string | null>(null);
  const mapListenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps script once globally (never removed to avoid "already defined" errors)
  useEffect(() => {
    if (!apiKey || typeof window === "undefined") {
      setLoaded(true);
      return;
    }
    loadGoogleMaps(apiKey).then(() => setLoaded(true)).catch(() => setLoaded(true));
  }, [apiKey]);

  // Create map once loaded
  useEffect(() => {
    if (!loaded || !containerRef.current || !window.google?.maps) return;

    const mapInstance = new google.maps.Map(containerRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    userHasInteractedRef.current = false;
    lastAppliedBoundsKeyRef.current = null;
    const onDragEnd = () => {
      userHasInteractedRef.current = true;
    };
    const onZoomChanged = () => {
      userHasInteractedRef.current = true;
    };
    const listeners: google.maps.MapsEventListener[] = [];
    listeners.push(mapInstance.addListener("dragend", onDragEnd));
    listeners.push(mapInstance.addListener("zoom_changed", onZoomChanged));
    mapListenersRef.current = listeners;
    setMap(mapInstance);

    return () => {
      listeners.forEach((l) => google.maps.event.removeListener(l));
      mapListenersRef.current = [];
      pickupMarkerRef.current?.setMap(null);
      pickupMarkerRef.current = null;
      dropMarkerRef.current?.setMap(null);
      dropMarkerRef.current = null;
      driverMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      myLocationMarkerRef.current?.setMap(null);
      myLocationMarkerRef.current = null;
      customMarkersRef.current.forEach((m) => m.setMap(null));
      customMarkersRef.current = [];
      driverMarkersMapRef.current.forEach(({ marker }) => marker.setMap(null));
      driverMarkersMapRef.current.clear();
      if (driverAnimationLoopRef.current != null) cancelAnimationFrame(driverAnimationLoopRef.current);
      driverAnimationLoopRef.current = null;
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current = null;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      if (driverAnimationRef.current != null) cancelAnimationFrame(driverAnimationRef.current);
      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
        mapClickListenerRef.current = null;
      }
    };
  }, [loaded]);

  // Preload vehicle PNGs; if any fail (404), we use SVG fallback for that type
  useEffect(() => {
    const types: RideType[] = ["bike", "mini", "sedan", "auto"];
    types.forEach((vehicleType) => {
      const url = getVehicleIconUrl(vehicleType);
      const img = new Image();
      img.onload = () => setPngLoaded((prev) => ({ ...prev, [vehicleType]: true }));
      img.onerror = () => {};
      img.src = url;
    });
  }, []);

  // Map click handler (for setting pickup/drop via map)
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    if (mapClickListenerRef.current) {
      mapClickListenerRef.current.remove();
      mapClickListenerRef.current = null;
    }
    if (!onClick) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    mapClickListenerRef.current = listener;
    return () => {
      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
        mapClickListenerRef.current = null;
      }
    };
  }, [map, onClick]);

  // Get user's current location when showMyLocation is true
  useEffect(() => {
    if (!showMyLocation || typeof window === "undefined" || !navigator.geolocation) return;
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.message || "Location unavailable");
        setCurrentLocation(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [showMyLocation]);

  // When user grants location via the top banner (LocationPrompt), show their position on the map
  useEffect(() => {
    if (!showMyLocation) return;
    const handler = (e: Event) => {
      const pos = (e as CustomEvent<GeolocationPosition>).detail;
      if (pos?.coords) {
        const loc: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        setLocationError(null);
      }
    };
    window.addEventListener("locationPermissionGranted", handler);
    return () => window.removeEventListener("locationPermissionGranted", handler);
  }, [showMyLocation]);

  // Only update map view when pickup/drop/currentLocation *change* (not on every render). Respect user zoom/pan.
  const boundsKey =
    [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, currentLocation?.lat, currentLocation?.lng]
      .filter((v) => v != null)
      .join(",") || "none";

  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const keyChanged = lastAppliedBoundsKeyRef.current !== boundsKey;
    if (userHasInteractedRef.current && !keyChanged) return;

    const hasPoints = pickup || drop || driverLocation || currentLocation;
    if (fitBounds && hasPoints) {
      const bounds = new google.maps.LatLngBounds();
      if (pickup) bounds.extend(pickup);
      if (drop) bounds.extend(drop);
      if (driverLocation) bounds.extend(driverLocation);
      if (currentLocation) bounds.extend(currentLocation);
      map.fitBounds(bounds, { top: 80, right: 40, bottom: 80, left: 40 });
    } else {
      const points: LatLng[] = [];
      if (pickup) points.push(pickup);
      if (drop) points.push(drop);
      if (currentLocation) points.push(currentLocation);
      const newCenter =
        points.length > 0
          ? {
              lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
              lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
            }
          : center;
      map.setCenter(newCenter);
      map.setZoom(zoom);
    }
    lastAppliedBoundsKeyRef.current = boundsKey;
    userHasInteractedRef.current = false;
  }, [map, boundsKey, center, zoom, pickup, drop, driverLocation, currentLocation, fitBounds]);

  const PIN_W = 36;
  const PIN_H = 50;
  const PIN_ANCHOR = { x: PIN_W / 2, y: PIN_H };

  // Pickup marker (green pin as in reference image)
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    pickupMarkerRef.current?.setMap(null);
    if (!pickup) {
      pickupMarkerRef.current = null;
      return;
    }
    const marker = new google.maps.Marker({
      position: pickup,
      map,
      title: "Pickup",
      draggable: pickupMarkerDraggable,
      icon: {
        url: getPickupPinIconUrl(),
        scaledSize: new google.maps.Size(PIN_W, PIN_H),
        anchor: new google.maps.Point(PIN_ANCHOR.x, PIN_ANCHOR.y),
      },
    });
    if (pickupMarkerDraggable && onPickupDragEnd) {
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) onPickupDragEnd({ lat: pos.lat(), lng: pos.lng() });
      });
    }
    pickupMarkerRef.current = marker;
    return () => {
      marker.setMap(null);
      pickupMarkerRef.current = null;
    };
  }, [map, pickup?.lat, pickup?.lng, pickupMarkerDraggable, onPickupDragEnd]);

  // Drop marker (dark pin)
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    dropMarkerRef.current?.setMap(null);
    if (!drop) {
      dropMarkerRef.current = null;
      return;
    }
    const marker = new google.maps.Marker({
      position: drop,
      map,
      title: "Drop",
      draggable: dropMarkerDraggable,
      icon: {
        url: getDropPinIconUrl(),
        scaledSize: new google.maps.Size(PIN_W, PIN_H),
        anchor: new google.maps.Point(PIN_ANCHOR.x, PIN_ANCHOR.y),
      },
    });
    if (dropMarkerDraggable && onDropDragEnd) {
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) onDropDragEnd({ lat: pos.lat(), lng: pos.lng() });
      });
    }
    dropMarkerRef.current = marker;
    return () => {
      marker.setMap(null);
      dropMarkerRef.current = null;
    };
  }, [map, drop?.lat, drop?.lng, dropMarkerDraggable, onDropDragEnd]);

  // My location marker (blue circle – "you are here")
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    myLocationMarkerRef.current?.setMap(null);
    myLocationMarkerRef.current = null;
    if (!currentLocation) return;
    const marker = new google.maps.Marker({
      position: currentLocation,
      map,
      title: "You are here",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
    });
    myLocationMarkerRef.current = marker;
    return () => {
      marker.setMap(null);
      myLocationMarkerRef.current = null;
    };
  }, [map, currentLocation?.lat, currentLocation?.lng]);

  // Driver marker (vehicle icon for booked type, or arrow) with optional smooth movement
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const size = new google.maps.Size(DRIVER_ICON_SIZE, DRIVER_ICON_SIZE);
    const anchor = new google.maps.Point(DRIVER_ICON_SIZE / 2, DRIVER_ICON_SIZE);

    const getIcon = () => {
      const vehicleType = driverVehicleType ?? "sedan";
      const url = pngLoaded[vehicleType]
        ? getVehicleIconUrl(vehicleType)
        : getVehicleIconFallbackSvg(vehicleType);
      return { url, scaledSize: size, anchor };
    };

    const createDriverMarker = (position: LatLng) => {
      return new google.maps.Marker({
        position,
        map,
        title: "Driver",
        icon: getIcon(),
      });
    };

    if (!driverLocation) {
      driverMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      lastDriverPosRef.current = null;
      if (driverAnimationRef.current != null) {
        cancelAnimationFrame(driverAnimationRef.current);
        driverAnimationRef.current = null;
      }
      return;
    }

    const prevPos = lastDriverPosRef.current;
    lastDriverPosRef.current = driverLocation;

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = createDriverMarker(driverLocation);
      return () => {
        driverMarkerRef.current?.setMap(null);
        driverMarkerRef.current = null;
      };
    }

    driverMarkerRef.current.setIcon(getIcon());

    if (!animateDriver || !prevPos) {
      driverMarkerRef.current.setPosition(driverLocation);
      return;
    }

    // Smooth animation from prevPos to driverLocation
    const startTime = performance.now();
    const start = { lat: prevPos.lat, lng: prevPos.lng };
    const end = { lat: driverLocation.lat, lng: driverLocation.lng };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DRIVER_ANIMATION_DURATION, 1);
      const eased = t * t * (3 - 2 * t); // smoothstep
      const lat = start.lat + (end.lat - start.lat) * eased;
      const lng = start.lng + (end.lng - start.lng) * eased;
      driverMarkerRef.current?.setPosition({ lat, lng });
      if (t < 1) {
        driverAnimationRef.current = requestAnimationFrame(tick);
      } else {
        driverAnimationRef.current = null;
      }
    };
    driverAnimationRef.current = requestAnimationFrame(tick);

    return () => {
      if (driverAnimationRef.current != null) {
        cancelAnimationFrame(driverAnimationRef.current);
        driverAnimationRef.current = null;
      }
    };
  }, [map, driverLocation?.lat, driverLocation?.lng, driverVehicleType, animateDriver, pngLoaded]);

  // Custom markers: non-drivers in customMarkersRef; drivers in driverMarkersMapRef with smooth animation
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const size = new google.maps.Size(DRIVER_ICON_SIZE, DRIVER_ICON_SIZE);
    const anchor = new google.maps.Point(DRIVER_ICON_SIZE / 2, DRIVER_ICON_SIZE);
    const iconCache: Partial<Record<RideType, google.maps.Icon>> = {};
    const getDriverIcon = (vehicleType: RideType): google.maps.Icon => {
      if (!iconCache[vehicleType]) {
        const url = pngLoaded[vehicleType]
          ? getVehicleIconUrl(vehicleType)
          : getVehicleIconFallbackSvg(vehicleType);
        iconCache[vehicleType] = { url, scaledSize: size, anchor };
      }
      return iconCache[vehicleType]!;
    };

    const driverConfigs = customMarkers.filter((c) => c.type === "driver");
    const otherConfigs = customMarkers.filter((c) => c.type !== "driver");
    const driverIds = new Set(driverConfigs.map((c) => c.id));

    // Remove driver markers no longer in list
    driverMarkersMapRef.current.forEach((entry, id) => {
      if (!driverIds.has(id)) {
        entry.marker.setMap(null);
        driverMarkersMapRef.current.delete(id);
      }
    });

    // Update or create driver markers (smooth movement: set target, animation loop will lerp)
    driverConfigs.forEach((config) => {
      const target: LatLng = { lat: config.position.lat, lng: config.position.lng };
      const existing = driverMarkersMapRef.current.get(config.id);
      if (existing) {
        existing.target = target;
      } else {
        const icon = config.vehicleType ? getDriverIcon(config.vehicleType) : { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 5, fillColor: "#1a73e8", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 };
        const marker = new google.maps.Marker({
          position: target,
          map,
          title: config.title,
          icon,
        });
        driverMarkersMapRef.current.set(config.id, {
          marker,
          current: { ...target },
          target: { ...target },
        });
      }
    });

    // Non-driver markers: replace all
    customMarkersRef.current.forEach((m) => m.setMap(null));
    customMarkersRef.current = [];
    otherConfigs.forEach((config) => {
      let icon: google.maps.Symbol | google.maps.Icon;
      if (config.type === "pickup") {
        icon = { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#00d68f", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 };
      } else if (config.type === "drop") {
        icon = { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 };
      } else {
        icon = (config.icon as google.maps.Symbol) ?? { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#666", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 };
      }
      const marker = new google.maps.Marker({ position: config.position, map, title: config.title, icon });
      customMarkersRef.current.push(marker);
    });
  }, [map, customMarkers, pngLoaded]);

  // Smooth animation loop for driver markers (lerp current → target)
  const DRIVER_LERP = 0.06;
  const DRIVER_EPS = 1e-7;
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const tick = () => {
      let anyAnimating = false;
      driverMarkersMapRef.current.forEach((entry) => {
        const { marker, current, target } = entry;
        const dLat = target.lat - current.lat;
        const dLng = target.lng - current.lng;
        if (Math.abs(dLat) > DRIVER_EPS || Math.abs(dLng) > DRIVER_EPS) {
          anyAnimating = true;
          entry.current = {
            lat: current.lat + dLat * DRIVER_LERP,
            lng: current.lng + dLng * DRIVER_LERP,
          };
          marker.setPosition(entry.current);
        }
      });
      if (anyAnimating) driverAnimationLoopRef.current = requestAnimationFrame(tick);
      else driverAnimationLoopRef.current = null;
    };

    const startLoop = () => {
      if (driverAnimationLoopRef.current == null) driverAnimationLoopRef.current = requestAnimationFrame(tick);
    };
    startLoop();

    return () => {
      if (driverAnimationLoopRef.current != null) {
        cancelAnimationFrame(driverAnimationLoopRef.current);
        driverAnimationLoopRef.current = null;
      }
    };
  }, [map, customMarkers]);

  // Route: either polyline from routePath or Directions (pickup → drop)
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    directionsRendererRef.current?.setMap(null);
    directionsRendererRef.current = null;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    const hasPath = routePath && routePath.length >= 2;
    const hasDirections = showRoute && pickup && drop;

    if (hasPath) {
      const line = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: "#1a73e8",
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      });
      polylineRef.current = line;
      return () => {
        line.setMap(null);
        polylineRef.current = null;
      };
    }

    if (hasDirections) {
      const directionsService = new google.maps.DirectionsService();
      const renderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
      });
      directionsRendererRef.current = renderer;
      directionsService.route(
        {
          origin: pickup,
          destination: drop,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: google.maps.DirectionsResult | null, status) => {
          if (status === "OK" && result) {
            renderer.setDirections(result);
            const route = result.routes?.[0];
            if (route && onRouteReady && route.legs?.length) {
              const path: LatLng[] = [];
              route.legs.forEach((leg: google.maps.DirectionsLeg) => {
                leg.steps?.forEach((step: google.maps.DirectionsStep, i: number) => {
                  if (i === 0) path.push({ lat: step.start_location.lat(), lng: step.start_location.lng() });
                  path.push({ lat: step.end_location.lat(), lng: step.end_location.lng() });
                });
              });
              if (path.length >= 2) onRouteReady(path);
            }
          }
        }
      );
      return () => {
        renderer.setMap(null);
        directionsRendererRef.current = null;
      };
    }
  }, [map, showRoute, pickup, drop, routePath]);

  if (!apiKey) {
    return (
      <div
        className={`map-container flex items-center justify-center bg-gray-200 ${className}`}
      >
        <div className="text-center p-4 text-gray-600">
          <p className="font-medium">Map placeholder</p>
          <p className="text-sm">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google Maps</p>
          {children}
        </div>
      </div>
    );
  }

  const handleCenterOnMyLocation = () => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        map.setCenter(loc);
        map.setZoom(15);
      },
      () => setLocationError("Could not get location")
    );
  };

  return (
    <div ref={containerRef} className={`map-container relative ${className}`}>
      {showMyLocation && (
        <button
          type="button"
          onClick={handleCenterOnMyLocation}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-uber-green"
          title="Center on my location"
          aria-label="Center on my location"
        >
          <span className="text-xl" aria-hidden>📍</span>
        </button>
      )}
      {locationError && showMyLocation && (
        <p className="absolute left-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-xs text-amber-700 shadow">
          {locationError}
        </p>
      )}
      {children}
    </div>
  );
}

declare global {
  interface Window {
    google?: typeof google;
  }
}
