import { BUSINESS } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-500">
      <p>{BUSINESS.legalName} · {BUSINESS.rcNumber} · {BUSINESS.publicAddress}</p>
      <p className="mt-1">
        <a href={`mailto:${BUSINESS.email}`} className="underline hover:text-stone-800">{BUSINESS.email}</a>
      </p>
    </footer>
  );
}
