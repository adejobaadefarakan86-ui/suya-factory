import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatOrderDate } from "@/lib/orders";
import { telLink, toInternationalDigits, whatsappLink } from "@/lib/contacts";
import type { CountryCode } from "@/lib/countries";
import { PhoneText } from "@/components/phone-text";
import { AutoRefresh } from "@/components/auto-refresh";
import { EnquiryEditor } from "./enquiry-editor";

export const metadata = { title: "Bulk enquiries · Admin · Suya Factory" };

const TABS = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "converted", label: "Converted" },
  { status: "closed", label: "Closed" },
];

type Enquiry = {
  id: string;
  country: CountryCode;
  name: string;
  phone: string;
  email: string | null;
  quantity_kg: number;
  needed_by: string | null;
  location: string;
  message: string | null;
  status: string;
  staff_notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminEnquiriesPage(props: PageProps<"/admin/enquiries">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Bulk enquiries</h1>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading enquiries…</p>}>
        <EnquiryList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function EnquiryList({ searchParams }: { searchParams: PageProps<"/admin/enquiries">["searchParams"] }) {
  await requireStaff("/admin/enquiries");
  const sp = await searchParams;
  const status = TABS.find((t) => t.status === sp.status)?.status ?? "new";
  const supabase = await createClient();

  const counts = await Promise.all(
    TABS.map(async (t) =>
      (await supabase.from("bulk_enquiries").select("id", { count: "exact", head: true }).eq("status", t.status)).count ?? 0),
  );
  const { data, error } = await supabase
    .from("bulk_enquiries")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: status === "new" }) // new: oldest first, so nobody waits too long
    .limit(100);
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load enquiries: {error.message}</p>;
  const enquiries = (data ?? []) as Enquiry[];

  return (
    <>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Enquiry status">
        {TABS.map((t, i) => (
          <Link key={t.status} href={`/admin/enquiries?status=${t.status}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              t.status === status ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100"
            }`}>
            {t.label} <span className="tabular-nums opacity-70">{counts[i]}</span>
          </Link>
        ))}
      </nav>

      {enquiries.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">No enquiries here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {enquiries.map((e) => {
            const digits = toInternationalDigits(e.phone, e.country);
            const first = e.name.split(" ")[0];
            return (
              <li key={e.id} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 md:grid-cols-[1fr_18rem]">
                <div className="text-sm">
                  <p className="text-lg font-semibold text-stone-900">
                    {Number(e.quantity_kg)}kg <span className="font-normal text-stone-500">for</span> {e.name}
                    <span className="ml-2 text-sm">{e.country === "NG" ? "🇳🇬" : "🇬🇭"}</span>
                  </p>
                  <p className="text-stone-500">Received {formatOrderDate(e.created_at, e.country)}</p>
                  <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-y-1">
                    <dt className="text-stone-500">Phone</dt><dd><PhoneText value={e.phone} /></dd>
                    {e.email && (<><dt className="text-stone-500">Email</dt><dd className="break-all">{e.email}</dd></>)}
                    <dt className="text-stone-500">Deliver to</dt><dd>{e.location}</dd>
                    <dt className="text-stone-500">Needed by</dt><dd>{e.needed_by ?? "Not specified"}</dd>
                  </dl>
                  {e.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-stone-50 p-3 text-stone-800">{e.message}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={whatsappLink(digits, `Hi ${first}, this is Suya Factory about your bulk order enquiry for ${Number(e.quantity_kg)}kg of Beef Kilishi.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700">💬 WhatsApp</a>
                    <a href={telLink(digits)} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold hover:bg-stone-50">📞 Call</a>
                    {e.email && <a href={`mailto:${e.email}`} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold hover:bg-stone-50">✉️ Email</a>}
                  </div>
                </div>
                <EnquiryEditor id={e.id} status={e.status} staffNotes={e.staff_notes} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
