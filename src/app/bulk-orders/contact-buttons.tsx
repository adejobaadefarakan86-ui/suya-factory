"use client";
import { useState, useSyncExternalStore } from "react";
import { formatPhone, telLink, whatsappLink } from "@/lib/contacts";

// Some browsers rewrite phone numbers on the page (e.g. turning them into
// links), which makes React complain that the page changed. So the number
// text is only shown after the page has loaded in the browser.
const subscribe = () => () => {};
function useInBrowser() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function ContactButtons({ whatsapp, phones }: { whatsapp: string; phones: string[] }) {
  const inBrowser = useInBrowser();
  const [copied, setCopied] = useState<string | null>(null);

  async function copyNumber(phone: string) {
    try {
      await navigator.clipboard.writeText(`+${phone}`);
      setCopied(phone);
      setTimeout(() => setCopied((c) => (c === phone ? null : c)), 2500);
    } catch {
      // Clipboard blocked (rare): let the customer copy it by hand.
      window.prompt("Copy this number:", `+${phone}`);
    }
  }

  // One full-width row each: WhatsApp first, then each call number with its own Copy.
  return (
    <div className="space-y-2.5">
      <a
        href={whatsappLink(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 rounded-xl bg-green-600 px-4 py-3.5 text-white transition hover:bg-green-700"
      >
        <span className="font-medium">Chat on WhatsApp</span>
        <span className="text-sm tabular-nums text-green-50">{inBrowser ? formatPhone(whatsapp) : " "}</span>
      </a>

      {/* tel: = an ordinary phone call. The phone chooses its calling app. Either number works. */}
      {phones.map((phone) => (
        <div key={phone} className="flex items-stretch gap-2">
          <a
            href={telLink(phone)}
            className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-ink transition hover:border-ink"
          >
            <span className="font-medium">Call us</span>
            <span className="text-sm tabular-nums text-muted">{inBrowser ? formatPhone(phone) : " "}</span>
          </a>
          <button
            type="button"
            onClick={() => copyNumber(phone)}
            aria-label={`Copy ${formatPhone(phone)}`}
            className="rounded-xl border border-line px-3.5 text-sm font-medium text-accent-strong transition hover:border-ink"
            aria-live="polite"
          >
            {copied === phone ? "Copied" : "Copy"}
          </button>
        </div>
      ))}
    </div>
  );
}
