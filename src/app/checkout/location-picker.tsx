"use client";
// Delivery location, the way delivery apps do it:
//  - a single "Add delivery address" row; nothing else until it's tapped
//  - tapping opens a full-screen sheet: search any place ("KFC Ikeja") or use GPS
//  - then a map with a fixed centre pin; drag the map to fine-tune, confirm.
//
// 100% free, no key, no card:
//  - map tiles: OpenFreeMap (openfreemap.org), drawn with MapLibre
//  - search + address lookup: Photon (photon.komoot.io), built on OpenStreetMap
// Photon is a free public service with fair use limits: if order volume grows,
// swap PHOTON for a paid geocoder (or Google Places) in the helpers below.
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { CountryCode } from "@/lib/countries";

export type PickedLocation = {
  lat: number;
  lng: number;
  accuracy: number | null; // metres, only when it came from GPS
  name: string;            // "KFC" or the street
  address: string;         // "KFC, Airport Road, Ikeja G.R.A, Lagos"
  city: string;
};

type LatLng = { lat: number; lng: number };

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const PHOTON = "https://photon.komoot.io";

const START: Record<CountryCode, LatLng> = {
  NG: { lat: 6.5244, lng: 3.3792 }, // Lagos
  GH: { lat: 5.6037, lng: -0.187 }, // Accra
};

// Keep search results inside the country (minLon, minLat, maxLon, maxLat).
const BBOX: Record<CountryCode, string> = {
  NG: "2.66,4.24,14.70,13.90",
  GH: "-3.27,4.70,1.21,11.18",
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function LocationPicker({
  country,
  value,
  onChange,
}: {
  country: CountryCode;
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-stone-300 hover:shadow-sm"
      >
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${value ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-500"}`}>
          <PinIcon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block truncate font-semibold text-stone-900">{value.name}</span>
              <span className="block truncate text-sm text-stone-500">{value.address}</span>
            </>
          ) : (
            <>
              <span className="block font-semibold text-stone-900">Add delivery address</span>
              <span className="block text-sm text-stone-500">Search a place or use your current location</span>
            </>
          )}
        </span>
        {value ? (
          <span className="text-sm font-medium text-orange-700 group-hover:underline">Change</span>
        ) : (
          <ChevronIcon className="size-5 text-stone-400" />
        )}
      </button>

      {open && (
        <Sheet
          country={country}
          initial={value}
          onClose={() => setOpen(false)}
          onConfirm={(loc) => {
            onChange(loc);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function Sheet({
  country,
  initial,
  onClose,
  onConfirm,
}: {
  country: CountryCode;
  initial: PickedLocation | null;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
}) {
  const [step, setStep] = useState<"search" | "map">(initial ? "map" : "search");
  const [draft, setDraft] = useState<PickedLocation | null>(initial);

  // Lock page scroll and close on Escape while the sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery address"
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-[min(44rem,90dvh)] sm:max-w-lg sm:rounded-3xl sm:shadow-2xl"
      >
        {step === "search" ? (
          <SearchStep
            country={country}
            near={draft ?? START[country]}
            onClose={onClose}
            onPick={(loc) => {
              setDraft(loc);
              setStep("map");
            }}
          />
        ) : (
          <MapStep
            draft={draft ?? { ...START[country], accuracy: null, name: "", address: "", city: "" }}
            onBack={() => setStep("search")}
            onChange={setDraft}
            onConfirm={() => draft && onConfirm(draft)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: search, or use GPS

function SearchStep({
  country,
  near,
  onClose,
  onPick,
}: {
  country: CountryCode;
  near: LatLng;
  onClose: () => void;
  onPick: (loc: PickedLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => {
    clearTimeout(timer.current);
    inflight.current?.abort();
  }, []);

  // Suggestions as the customer types (debounced, older requests cancelled).
  function search(text: string) {
    setQuery(text);
    setError(null);
    clearTimeout(timer.current);
    inflight.current?.abort();
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      inflight.current = ctrl;
      try {
        const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&lat=${near.lat}&lon=${near.lng}&limit=7&lang=en&bbox=${BBOX[country]}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as PhotonResponse;
        setResults(dedupe(data.features.filter((f) => f.properties.countrycode === country).map(toLocation)));
        setSearching(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError("Search isn't working right now. Try “Use my current location”.");
        setSearching(false);
      }
    }, 300);
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError("Your browser can't share its location. Please search for your address instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const at = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        const found = await reverseLookup(at);
        setLocating(false);
        onPick({ ...found, ...at, accuracy: Math.round(pos.coords.accuracy) });
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser settings, or search for your address."
            : "We couldn't find you. Please try again or search for your address.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-stone-100 p-3">
        <IconButton label="Close" onClick={onClose}><CloseIcon className="size-5" /></IconButton>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-stone-400" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search street, estate or place"
            aria-label="Search for your delivery address"
            className="w-full rounded-full bg-stone-100 py-3 pl-11 pr-4 text-[15px] text-stone-900 outline-none placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={useGps}
          disabled={locating}
          className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 disabled:opacity-60"
        >
          <span className="grid size-10 place-items-center rounded-full bg-orange-50 text-orange-700">
            <LocateIcon className={`size-5 ${locating ? "animate-pulse" : ""}`} />
          </span>
          <span>
            <span className="block font-semibold text-stone-900">{locating ? "Finding you…" : "Use my current location"}</span>
            <span className="block text-sm text-stone-500">Most accurate when you&apos;re at the delivery spot</span>
          </span>
        </button>

        {error && <p role="alert" className="mx-5 mb-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        {results.length > 0 && (
          <ul className="border-t border-stone-100">
            {results.map((p) => (
              <li key={`${p.lat},${p.lng},${p.name}`}>
                <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-stone-50">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500">
                    <PinIcon className="size-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-stone-900">{p.name}</span>
                    <span className="block truncate text-sm text-stone-500">{p.address.replace(`${p.name}, `, "")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim().length >= 2 && !searching && results.length === 0 && !error && (
          <div className="px-5 py-6 text-center text-sm text-stone-500">
            <p>No places found. Try a nearby landmark or street name,</p>
            <p>or use your current location and move the pin.</p>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2: map with a fixed centre pin. Drag the map, not the pin.

function MapStep({
  draft,
  onBack,
  onChange,
  onConfirm,
}: {
  draft: PickedLocation;
  onBack: () => void;
  onChange: (loc: PickedLocation) => void;
  onConfirm: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const [moving, setMoving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [editing, setEditing] = useState(false);
  const start = useRef(draft); // where the map opens; never changes after mount
  const hasPlace = editing || draft.address !== "" || draft.name !== "";

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Create the map once (MapLibre only runs in the browser, so it's loaded here).
  useEffect(() => {
    let map: MapLibreMap | null = null;
    let cancelled = false;
    let lookup = 0;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      // The worker file is copied into /public on `npm install` (scripts/copy-maplibre-worker.mjs).
      maplibre.setWorkerUrl(new URL("/vendor/maplibre-gl-worker.mjs", window.location.origin).href);
      const from = start.current;
      const m = new maplibre.Map({
        container: box.current,
        style: MAP_STYLE,
        center: [from.lng, from.lat],
        zoom: from.address ? 17 : 12,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map = m;
      m.on("error", (e) => console.error("[map]", e.error));      m.touchZoomRotate.disableRotation();
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");

      // Only react to moves the customer makes (not the initial positioning).
      m.on("dragstart", () => setMoving(true));
      m.on("zoomstart", (e) => { if (e.originalEvent) setMoving(true); });
      m.on("moveend", async (e) => {
        setMoving(false);
        if (!e.originalEvent) return;
        const c = m.getCenter();
        const at = { lat: round(c.lat), lng: round(c.lng) };
        const mine = ++lookup;
        setResolving(true);
        const found = await reverseLookup(at);
        if (mine !== lookup || cancelled) return; // they moved again meanwhile
        setResolving(false);
        onChangeRef.current({ ...found, ...at, accuracy: null }); // moved by hand: no longer a GPS reading
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <>
      <div className="relative flex-1 bg-stone-100">
        {/* MapLibre's CSS forces position:relative on its container, so size it from a wrapper */}
        <div className="absolute inset-0">
          <div ref={box} className="h-full w-full" />
        </div>

        {/* Fixed centre pin: lifts while the map moves */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div className={`flex flex-col items-center transition-transform duration-200 ${moving ? "-translate-y-3" : ""}`}>
            <span className="grid size-9 place-items-center rounded-full bg-orange-600 shadow-lg ring-4 ring-white">
              <span className="size-2.5 rounded-full bg-white" />
            </span>
            <span className="h-4 w-0.5 bg-orange-600" />
          </div>
        </div>
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-950/30" />

        <div className="absolute left-3 top-3">
          <IconButton label="Back to search" onClick={onBack} floating><BackIcon className="size-5" /></IconButton>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <span className="rounded-full bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">Move the map to place the pin</span>
        </div>
      </div>

      <div className="space-y-4 rounded-t-3xl bg-white p-5 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)]">
        <div className="min-h-12">
          {moving || resolving ? (
            <div className="space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100" />
            </div>
          ) : hasPlace ? (
            <>
              {editing ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-stone-700">Your exact address</span>
                  <input
                    autoFocus
                    value={draft.name}
                    maxLength={120}
                    onChange={(e) => onChangeRef.current({ ...draft, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setEditing(false))}
                    placeholder="e.g. 12 Jibowu Road, blue gate"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-stone-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
                  />
                </label>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-stone-900">{draft.name}</p>
                  <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-sm font-medium text-orange-700 hover:underline">
                    Edit
                  </button>
                </div>
              )}
              <p className="mt-1 text-sm text-stone-500">{draft.address}</p>
              {draft.accuracy !== null && draft.accuracy > 100 && (
                <p className="mt-2 text-sm text-amber-700">
                  We could only find you to within about {draft.accuracy} m (common on laptops). Move the map to your exact gate.
                </p>
              )}
            </>
          ) : (
            <p className="text-stone-500">Move the map to your delivery spot.</p>
          )}
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!hasPlace || moving || resolving || !draft.name.trim()}
          className="w-full rounded-full bg-stone-900 px-4 py-3.5 font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
        >
          Confirm location
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Photon (OpenStreetMap) helpers

type PhotonProps = {
  name?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  locality?: string;
  city?: string;
  county?: string;
  state?: string;
  countrycode?: string;
  type?: string;    // "house", "street", "city"…
  osm_key?: string; // "highway" for roads, "amenity"/"shop"/"building" for places
};
type PhotonFeature = { properties: PhotonProps; geometry: { coordinates: [number, number] } };
type PhotonResponse = { features: PhotonFeature[] };

function toLocation(f: PhotonFeature): PickedLocation {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const name = p.name || street || p.district || p.city || "Pinned location";
  const city = p.city || p.county || p.state || "";
  const parts = [name, street, p.district || p.locality, city, p.state].filter((x): x is string => !!x);
  return {
    lat: round(lat),
    lng: round(lng),
    accuracy: null,
    name,
    address: [...new Set(parts)].join(", "),
    city,
  };
}

function dedupe(list: PickedLocation[]) {
  const seen = new Set<string>();
  return list.filter((l) => !seen.has(l.address) && seen.add(l.address));
}

// What's at a pin. OpenStreetMap rarely knows house numbers in Nigeria, so
// unless we hit a named building or an exact house, we honestly say "Near <street>"
// and let the customer type the exact address on the confirm screen.
async function reverseLookup(at: LatLng): Promise<Omit<PickedLocation, "lat" | "lng" | "accuracy">> {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${at.lat}&lon=${at.lng}&lang=en`);
    const data = (await res.json()) as PhotonResponse;
    const f = data.features[0];
    if (f) {
      const p = f.properties;
      const area = [p.district || p.locality, p.city || p.county, p.state].filter((x): x is string => !!x);
      const exact = p.type === "house" || (p.osm_key !== "highway" && !!p.name);
      if (!exact && (p.street || p.name)) {
        return {
          name: `Near ${p.osm_key === "highway" ? p.name : p.street}`,
          address: [...new Set(area)].join(", "),
          city: p.city || p.county || p.state || "",
        };
      }
      const loc = toLocation(f);
      return { name: loc.name, address: loc.address, city: loc.city };
    }
  } catch {
    // fall through: the pin itself is what matters; the words are a nicety
  }
  return { name: "Pinned location", address: `${at.lat}, ${at.lng}`, city: "" };
}

// --- icons -----------------------------------------------------------------

type IconProps = { className?: string };
const svg = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", "aria-hidden": true } as const;

function PinIcon(p: IconProps) {
  return <svg {...svg} {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
}
function SearchIcon(p: IconProps) {
  return <svg {...svg} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}
function LocateIcon(p: IconProps) {
  return <svg {...svg} {...p}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>;
}
function CloseIcon(p: IconProps) {
  return <svg {...svg} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
}
function BackIcon(p: IconProps) {
  return <svg {...svg} {...p}><path d="M15 18l-6-6 6-6" /></svg>;
}
function ChevronIcon(p: IconProps) {
  return <svg {...svg} {...p}><path d="m9 6 6 6-6 6" /></svg>;
}

function IconButton({ label, onClick, children, floating }: { label: string; onClick: () => void; children: React.ReactNode; floating?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid size-11 shrink-0 place-items-center rounded-full text-stone-700 hover:bg-stone-100 ${floating ? "bg-white shadow-md" : ""}`}
    >
      {children}
    </button>
  );
}
