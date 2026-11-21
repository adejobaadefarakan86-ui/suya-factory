import { BUSINESS } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-500">
      {BUSINESS.legalName} · {BUSINESS.rcNumber} · {BUSINESS.publicAddress}
    </footer>
  );
}
