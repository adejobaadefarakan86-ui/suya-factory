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

export function ContactButtons({ whatsapp, phone }: { whatsapp: string; phone: string }) {
  const inBrowser = useInBrowser();
  const [copied, setCopied] = useState(false);
  const shown = formatPhone(phone);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(`+${phone}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (rare): let the customer copy it by hand.
      window.prompt("Copy this number:", `+${phone}`);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a
        href={whatsappLink(whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-center font-semibold text-white hover:bg-green-700"
      >
        <span>💬 Chat on WhatsApp</span>
        <span className="text-sm font-normal text-green-50">{inBrowser ? formatPhone(whatsapp) : " "}</span>
      </a>

      <div className="flex flex-col gap-2">
        {/* tel: = an ordinary phone call. The phone chooses its calling app. */}
        <a
          href={telLink(phone)}
          className="flex flex-col items-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-900 hover:bg-stone-50"
        >
          <span>📞 Call us</span>
          <span className="text-sm font-normal text-stone-600">{inBrowser ? shown : " "}</span>
        </a>
        <button
          type="button"
          onClick={copyNumber}
          className="rounded-lg px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-50"
          aria-live="polite"
        >
          {copied ? "✓ Number copied" : "Copy number"}
        </button>
      </div>
    </div>
  );
}
