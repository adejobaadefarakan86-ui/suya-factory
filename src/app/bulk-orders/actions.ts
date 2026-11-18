"use server";
import { createClient } from "@/lib/supabase/server";
import { isCountry } from "@/lib/countries";
import { BULK_MIN_KG } from "@/lib/contacts";

export type EnquiryValues = {
  name: string;
  phone: string;
  email: string;
  country: string;
  quantityKg: string;
  neededBy: string;
  location: string;
  message: string;
};

export type EnquiryState = { error: string; values: EnquiryValues } | { sent: true } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function sendEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  // Honeypot: a field hidden from people. Only bots fill it in. Pretend it worked.
  if (text(formData, "website")) return { sent: true };

  const values: EnquiryValues = {
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    country: text(formData, "country"),
    quantityKg: text(formData, "quantityKg"),
    neededBy: text(formData, "neededBy"),
    location: text(formData, "location"),
    message: text(formData, "message"),
  };
  const fail = (error: string): EnquiryState => ({ error, values });

  const qty = Number(values.quantityKg);
  const digits = values.phone.replace(/\D/g, "");
  const today = new Date().toISOString().slice(0, 10);

  if (!values.name) return fail("Please enter your name.");
  if (!/^[0-9+()\s-]+$/.test(values.phone) || digits.length < 7 || digits.length > 15)
    return fail("Please enter a valid phone number (7 to 15 digits).");
  if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email))
    return fail("Please enter a valid email address, or leave it empty.");
  if (!isCountry(values.country)) return fail("Please choose Nigeria or Ghana.");
  if (!Number.isFinite(qty) || qty < BULK_MIN_KG)
    return fail(`Bulk orders start at ${BULK_MIN_KG}kg. For smaller amounts, please order packs in the shop.`);
  if (qty > 100000) return fail("Please contact us directly for very large orders.");
  if (values.neededBy && !/^\d{4}-\d{2}-\d{2}$/.test(values.neededBy)) return fail("Please choose a valid date.");
  if (values.neededBy && values.neededBy < today) return fail("The date you need it by can't be in the past.");
  if (!values.location) return fail("Please tell us where to deliver.");
  if (values.name.length > 100 || values.location.length > 200 || values.message.length > 1000)
    return fail("One of the fields is too long. Please shorten it.");

  const supabase = await createClient();
  const { error } = await supabase.from("bulk_enquiries").insert({
    name: values.name,
    phone: values.phone,
    email: values.email || null,
    country: values.country,
    quantity_kg: Math.round(qty * 10) / 10,
    needed_by: values.neededBy || null,
    location: values.location,
    message: values.message || null,
  });

  if (error) {
    console.error("bulk enquiry insert failed:", error);
    return fail("We couldn't send your enquiry. Please try again, or contact us on WhatsApp.");
  }
  return { sent: true };
}
