"use client";
// Slim bar stuck to the bottom of the screen on phones, so ordering is always
// one tap away. It shows once you've scrolled past the top of the page.
import Link from "next/link";
import { useEffect, useState } from "react";

export function OrderBar({ title, note, href, action }: { title: string; note: string; href: string; action: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Shown past the top of the page, hidden again near the footer (so it never covers it).
    const onScroll = () => {
      const nearEnd = window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 320;
      setShow(window.scrollY > 520 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-4 pt-3 transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="block truncate font-display font-semibold text-ink">{title}</span>
          <span className="block truncate text-muted">{note}</span>
        </p>
        <Link href={href} tabIndex={show ? 0 : -1} className="btn btn-primary shrink-0 px-5 py-2.5">{action}</Link>
      </div>
    </div>
  );
}
