import Image from "next/image";
import { Suspense } from "react";
import { getCountry } from "@/lib/country";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { CONTACTS, BULK_MIN_KG } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ContactButtons } from "./contact-buttons";
import { EnquiryForm } from "./enquiry-form";

export const metadata = {
  title: "Bulk & custom orders · Suya Factory",
  description: "Order Beef Kilishi in bulk (1kg and above) or with custom packaging, in Nigeria and Ghana.",
};

export default function BulkOrdersPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">{BULK_MIN_KG}kg and above</p>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="mt-1 text-3xl font-bold text-stone-900">Bulk & custom orders</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Buying for an event, your shop or as gifts? Order Beef Kilishi from {BULK_MIN_KG}kg upwards, with custom
            packaging if you need it. Talk to us directly, or send an enquiry and we&apos;ll get back to you.
          </p>
        </div>
        <Image src="/images/kilishi-1kg.webp" alt="1kg of Suya Factory kilishi in a tray" width={160} height={154}
          className="hidden shrink-0 rounded-2xl sm:block" />
      </div>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-stone-200" />}>
        <BulkContent />
      </Suspense>
    </main>
  );
}

async function BulkContent() {
  const [country, user] = await Promise.all([getCountry(), getCurrentUser()]);

  let phone = "";
  if (user) {
    const { data } = await (await createClient()).from("profiles").select("phone").eq("id", user.id).single();
    phone = data?.phone ?? "";
  }

  // The visitor's own country first.
  const order: CountryCode[] = country === "GH" ? ["GH", "NG"] : ["NG", "GH"];

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <section className="space-y-6">
        {order.map((c, i) => (
          <div key={c} className={i === 0 ? "rounded-2xl border border-stone-200 bg-white p-6" : "rounded-2xl border border-dashed border-stone-300 p-6"}>
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              {c === "NG" ? "🇳🇬" : "🇬🇭"} {COUNTRIES[c].name}
            </h2>
            <ContactButtons whatsapp={CONTACTS[c].whatsapp} phone={CONTACTS[c].phone} />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Send an enquiry</h2>
        <EnquiryForm
          country={country}
          defaults={{ name: user?.fullName ?? "", email: user?.email ?? "", phone }}
        />
      </section>
    </div>
  );
}
