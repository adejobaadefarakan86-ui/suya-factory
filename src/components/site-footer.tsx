import Link from "next/link";
import { Suspense } from "react";
import { BUSINESS, SOCIAL } from "@/lib/business";
import { getCountry } from "@/lib/country";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-500">
      {/* Social links depend on the visitor's country (a cookie), so they stream in. */}
      <Suspense fallback={<p className="h-5" />}>
        <SocialLinks />
      </Suspense>
      <p className="mt-2">{BUSINESS.legalName} · {BUSINESS.rcNumber} · {BUSINESS.publicAddress}</p>
      <p className="mt-1">
        <a href={`mailto:${BUSINESS.email}`} className="underline hover:text-stone-800">{BUSINESS.email}</a>
        {" · "}<Link href="/terms" className="underline hover:text-stone-800">Terms</Link>
        {" · "}<Link href="/privacy" className="underline hover:text-stone-800">Privacy</Link>
      </p>
    </footer>
  );
}

async function SocialLinks() {
  const country = await getCountry();
  return (
    <p className="flex justify-center gap-4 text-sm font-medium text-stone-700">
      {SOCIAL[country].map((s) => (
        <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-orange-700">
          {s.name}
        </a>
      ))}
    </p>
  );
}
