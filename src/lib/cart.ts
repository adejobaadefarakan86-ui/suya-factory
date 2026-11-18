"use client";
// The shopping cart, kept in the browser (localStorage).
// It stores ONLY which variants and how many. Prices are always looked up
// fresh from the catalogue, so switching country shows the right currency
// and nobody can edit a price in their browser.
import { useSyncExternalStore } from "react";

export type CartLine = { variantId: string; quantity: number };

const STORAGE_KEY = "sf_cart_v1";
export const MAX_QTY = 20;
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isLine(x: unknown): x is CartLine {
  const l = x as CartLine;
  return typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0;
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    lines = Array.isArray(parsed) ? parsed.filter(isLine) : EMPTY;
  } catch {
    lines = EMPTY; // storage blocked or corrupted: start with an empty cart
  }
}

function update(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private mode etc.: the cart still works until the tab is closed.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep several open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const clamp = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(n)));

export const cart = {
  add(variantId: string, quantity = 1) {
    load();
    const existing = lines.find((l) => l.variantId === variantId);
    update(
      existing
        ? lines.map((l) =>
            l.variantId === variantId ? { ...l, quantity: clamp(l.quantity + quantity) } : l,
          )
        : [...lines, { variantId, quantity: clamp(quantity) }],
    );
  },
  setQuantity(variantId: string, quantity: number) {
    load();
    const q = clamp(quantity);
    update(
      q === 0
        ? lines.filter((l) => l.variantId !== variantId)
        : lines.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
    );
  },
  remove(variantId: string) {
    load();
    update(lines.filter((l) => l.variantId !== variantId));
  },
  clear() {
    update(EMPTY);
  },
};

/** React hook: the current cart lines. Empty on the server and on first paint. */
export function useCartLines() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return lines;
    },
    () => EMPTY,
  );
}

export function useCartCount() {
  return useCartLines().reduce((sum, l) => sum + l.quantity, 0);
}
