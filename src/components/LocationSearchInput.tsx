"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceResult } from "@/types";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";

interface LocationSearchInputProps {
  placeholder?: string;
  value?: string;
  onSelect: (place: PlaceResult) => void;
  disabled?: boolean;
  className?: string;
}

type AutocompletePrediction = google.maps.places.AutocompletePrediction;

/**
 * Location search restricted to India only (like Ola/Uber). Uses Google Places
 * AutocompleteService with address + establishment types; results are always
 * within India via componentRestrictions. No international fallback.
 */
export function LocationSearchInput({
  placeholder = "Enter location",
  value = "",
  onSelect,
  disabled = false,
  className = "",
}: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!apiKey || typeof window === "undefined") return;
    loadGoogleMaps(apiKey).then(() => setMapsReady(true)).catch(() => setMapsReady(false));
  }, [apiKey]);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!mapsReady || !apiKey || !input.trim() || typeof window === "undefined") {
        setPredictions([]);
        setOpen(false);
        return;
      }
      if (!window.google?.maps?.places) return;

      const service = new google.maps.places.AutocompleteService();
      const indiaBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(8.0, 68.0),
        new google.maps.LatLng(35.5, 97.5)
      );

      // India only — same as Ola/Uber: never show USA/UK or other countries.
      const baseRequest: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        componentRestrictions: { country: "in" },
        bounds: indiaBounds,
      };

      setLoading(true);
      const seen = new Set<string>();
      const merged: AutocompletePrediction[] = [];

      const add = (list: AutocompletePrediction[] | null) => {
        if (!list) return;
        for (const p of list) {
          if (p.place_id && !seen.has(p.place_id)) {
            seen.add(p.place_id);
            merged.push(p);
          }
        }
      };

      Promise.all([
        new Promise<AutocompletePrediction[] | null>((resolve) => {
          service.getPlacePredictions(
            { ...baseRequest, types: ["address"] },
            (res) => resolve(res ?? null)
          );
        }),
        new Promise<AutocompletePrediction[] | null>((resolve) => {
          service.getPlacePredictions(
            { ...baseRequest, types: ["establishment"] },
            (res) => resolve(res ?? null)
          );
        }),
      ])
        .then(([addresses, establishments]) => {
          add(addresses ?? null);
          add(establishments ?? null);
          setPredictions(merged.slice(0, 12));
          setOpen(merged.length > 0);
        })
        .catch(() => {
          setPredictions([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    },
    [apiKey, mapsReady]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchPredictions(inputValue), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchPredictions]);

  const handleSelect = useCallback(
    (placeId: string) => {
      if (!placeId || !window.google?.maps?.places) return;
      const placesService = new google.maps.places.PlacesService(
        document.createElement("div")
      );
      placesService.getDetails(
        {
          placeId,
          fields: ["place_id", "formatted_address", "geometry"],
        },
        (place, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
          const geo = place.geometry?.location;
          if (geo && place.place_id && place.formatted_address) {
            const result: PlaceResult = {
              placeId: place.place_id,
              address: place.formatted_address,
              lat: geo.lat(),
              lng: geo.lng(),
            };
            setInputValue(place.formatted_address);
            setPredictions([]);
            setOpen(false);
            onSelect(result);
          }
        }
      );
    },
    [onSelect]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        title={inputValue || undefined}
        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm transition-colors placeholder:text-gray-400 focus:border-uber-green focus:bg-white focus:outline-none focus:ring-2 focus:ring-uber-green/20 disabled:bg-gray-100"
        autoComplete="off"
        aria-expanded={open}
        aria-haspopup="listbox"
        role="combobox"
      />
      {open && (
        <ul
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {loading && predictions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500">Searching…</li>
          ) : (
            predictions.map((p) => (
              <li
                key={p.place_id}
                role="option"
                className="cursor-pointer px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-uber-green/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(p.place_id!);
                }}
              >
                <span className="font-medium text-gray-900">
                  {p.structured_formatting?.main_text ?? p.description}
                </span>
                {p.structured_formatting?.secondary_text && (
                  <span className="block truncate text-xs text-gray-500">
                    {p.structured_formatting.secondary_text}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
