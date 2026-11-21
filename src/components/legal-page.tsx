// Shared look for the Terms and Privacy pages: plain, readable, numbered sections.
import { BUSINESS } from "@/lib/business";

export const LEGAL_UPDATED = "21 November 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-4 text-ink">{intro}</div>
      <div className="mt-8 space-y-8 text-ink [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
        {children}
      </div>
      <p className="mt-10 rounded-xl bg-cream p-4 text-sm text-ink">
        Questions? Email <a href={`mailto:${BUSINESS.email}`} className="font-medium text-accent-strong underline">{BUSINESS.email}</a>.
        {" "}{BUSINESS.legalName} · {BUSINESS.rcNumber} · {BUSINESS.publicAddress}.
      </p>
    </main>
  );
}
