// Supermarkets that stock our kilishi. Shared by server and browser code.
import type { CountryCode } from "@/lib/countries";

/**
 * Countries where customers buy from supermarkets instead of ordering online
 * from us. (Nigeria for now; Ghana still orders online.)
 */
export const SELLS_VIA_SUPERMARKETS: Record<CountryCode, boolean> = { NG: true, GH: false };

export type Store = {
  id: string;
  storeNo: number;
  name: string;
  branch: string | null;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;    // international digits
  whatsapp: string | null; // international digits
  openingHours: string | null;
  packs: string | null;
  inStock: boolean;
  stockUpdatedAt: string;
  outReportedAt: string | null;
};

export const STORE_FIELDS =
  "id, store_no, name, branch, address, lat, lng, phone, whatsapp, opening_hours, packs, in_stock, stock_updated_at, out_reported_at";

export type StoreRow = {
  id: string;
  store_no: number;
  name: string;
  branch: string | null;
  address: string;
  lat: number | string;
  lng: number | string;
  phone: string | null;
  whatsapp: string | null;
  opening_hours: string | null;
  packs: string | null;
  in_stock: boolean;
  stock_updated_at: string;
  out_reported_at: string | null;
};

export function toStore(r: StoreRow): Store {
  return {
    id: r.id,
    storeNo: r.store_no,
    name: r.name,
    branch: r.branch,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    phone: r.phone,
    whatsapp: r.whatsapp,
    openingHours: r.opening_hours,
    packs: r.packs,
    inStock: r.in_stock,
    stockUpdatedAt: r.stock_updated_at,
    outReportedAt: r.out_reported_at,
  };
}

/** "Shoprite – Ikeja City Mall" */
export function storeTitle(s: Pick<Store, "name" | "branch">) {
  return s.branch ? `${s.name} – ${s.branch}` : s.name;
}

/** Rough road distance in km: straight line × 1.3 (city roads wind), like delivery prices. */
export function roadKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.3;
}

export function directionsLink(s: Pick<Store, "lat" | "lng">) {
  return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
}

export function mapPinLink(s: Pick<Store, "lat" | "lng">) {
  return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
}
