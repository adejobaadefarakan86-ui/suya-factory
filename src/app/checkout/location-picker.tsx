"use client";
// Exact delivery location: "Use my current location" (phone GPS) or tap/drag a
// pin on a map. Uses Leaflet with free OpenStreetMap tiles (attribution required).
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { CountryCode } from "@/lib/countries";

export type PickedLocation = { lat: number; lng: number; accuracy: number | null };

// Where the map starts before a pin is placed.
const START: Record<CountryCode, [number, number]> = {
  NG: [6.5244, 3.3792], // Lagos
  GH: [5.6037, -0.187], // Accra
};

const round = (n: number) => Math.round(n * 1e6) / 1e6; // ~10 cm precision is plenty

export function LocationPicker({
  country,
  value,
  onChange,
}: {
  country: CountryCode;
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Create the map once (Leaflet only works in the browser, so it's loaded here).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current || map.current) return;

      const m = L.map(box.current, { scrollWheelZoom: false }).setView(START[country], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);

      // An emoji pin avoids Leaflet's default image files (which bundlers often break).
      const icon = L.divIcon({ html: "📍", className: "text-3xl leading-none", iconSize: [30, 30], iconAnchor: [15, 28] });
      const mk = L.marker(START[country], { draggable: true, icon });
      mk.on("dragend", () => {
        const p = mk.getLatLng();
        onChangeRef.current({ lat: round(p.lat), lng: round(p.lng), accuracy: null });
      });
      m.on("click", (e) => {
        mk.setLatLng(e.latlng).addTo(m);
        onChangeRef.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng), accuracy: null });
      });
      map.current = m;
      marker.current = mk;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [country]);

  // Keep the pin where the chosen location is.
  useEffect(() => {
    if (!value || !map.current || !marker.current) return;
    marker.current.setLatLng([value.lat, value.lng]).addTo(map.current);
  }, [value]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGpsError("Your browser can't share its location. Please tap the map to place the pin.");
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude), accuracy: Math.round(pos.coords.accuracy) };
        onChangeRef.current(loc);
        map.current?.setView([loc.lat, loc.lng], 17);
      },
      (err) => {
        setLocating(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Allow it in your browser settings, or tap the map to place the pin."
            : "We couldn't get your location. Please try again or tap the map to place the pin.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={useMyLocation} disabled={locating}
        className="w-full rounded-lg border-2 border-orange-600 bg-orange-50 px-4 py-2.5 font-semibold text-orange-800 hover:bg-orange-100 disabled:opacity-60">
        {locating ? "Finding you…" : "📍 Use my current location"}
      </button>
      <div ref={box} className="h-64 w-full overflow-hidden rounded-lg border border-stone-300" aria-label="Map: tap to place your delivery pin" />
      {gpsError && <p role="alert" className="text-sm text-red-700">{gpsError}</p>}
      <p className={`text-sm ${value ? "text-green-700" : "text-stone-600"}`}>
        {value
          ? `✓ Pin set${value.accuracy ? ` (accurate to about ${value.accuracy}m)` : ""}. Drag it if it's not exactly right.`
          : "Tap “Use my current location”, or tap the map where we should deliver."}
      </p>
      {value?.accuracy && value.accuracy > 100 && (
        <p className="text-sm text-amber-800">Your location is only approximate. Please drag the pin to your exact spot.</p>
      )}
    </div>
  );
}
