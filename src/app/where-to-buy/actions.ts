"use server";
import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { STORE_FIELDS, toStore, type StoreRow } from "@/lib/stores";
import { DELIVERY_COMPANIES } from "@/lib/delivery-companies";
import { alertOutOfStockReport, alertStorePickup } from "@/lib/staff-alerts";

const isId = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

async function loadStore(id: string) {
  const { data } = await createPublicClient().from("stores").select(STORE_FIELDS).eq("id", id).single();
  return data ? toStore(data as StoreRow) : null;
}

/** A customer says this store has run out. Staff are told; the store isn't changed until they check. */
export async function reportOutOfStock(storeId: string): Promise<{ ok: boolean }> {
  if (!isId(storeId)) return { ok: false };
  const { data, error } = await createPublicClient().rpc("report_store_out_of_stock", { p_store_id: storeId });
  if (error) {
    console.error("report_store_out_of_stock failed:", error);
    return { ok: false };
  }
  if (data === true) {
    after(async () => {
      const store = await loadStore(storeId);
      if (store) await alertOutOfStockReport(store);
    });
  }
  return { ok: true };
}

export type PickupInput = {
  storeId: string;
  customerName: string;
  customerPhone: string;
  paidFrom: string;
  riderName: string;
  riderPhone: string;
  riderPlate: string;
  deliveryCompany: string;
};

const MESSAGES: Record<string, string> = {
  store: "This supermarket isn't available any more. Please go back and choose another.",
  name: "Please enter your name.",
  phone: "Please enter your phone number.",
  rider_name: "Please enter the rider's name.",
  rider_phone: "Please enter the rider's phone number.",
  too_long: "One of the fields is too long. Please shorten it.",
};

/** Records the pickup and returns the code the rider says at the counter. */
export async function logPickup(input: PickupInput): Promise<{ code: string } | { error: string }> {
  if (!isId(input.storeId)) return { error: MESSAGES.store };
  const company = DELIVERY_COMPANIES.find((c) => c.id === input.deliveryCompany)?.name ?? input.deliveryCompany;

  const { data, error } = await createPublicClient().rpc("log_store_pickup", {
    p_store_id: input.storeId,
    p_customer_name: String(input.customerName ?? "").slice(0, 100),
    p_customer_phone: String(input.customerPhone ?? "").slice(0, 20),
    p_paid_from: String(input.paidFrom ?? "").slice(0, 100),
    p_rider_name: String(input.riderName ?? "").slice(0, 100),
    p_rider_phone: String(input.riderPhone ?? "").slice(0, 20),
    p_rider_plate: String(input.riderPlate ?? "").slice(0, 20),
    p_delivery_company: String(company ?? "").slice(0, 50),
  });
  if (error) {
    const code = error.message.startsWith("SF:") ? error.message.slice(3) : "";
    if (!MESSAGES[code]) console.error("log_store_pickup failed:", error);
    return { error: MESSAGES[code] ?? "Something went wrong. Please try again." };
  }

  const code = String(data);
  after(async () => {
    const store = await loadStore(input.storeId);
    if (store) await alertStorePickup(store, { ...input, deliveryCompany: company, code });
  });
  return { code };
}
