"use client";
// The footer appears on the home page only. Just before you reach it, it is
// pushed up from below with a little bounce, as if forced up into place.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function FooterRise({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Start the rise a little before the footer scrolls into view.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setUp(true); io.disconnect(); }
    }, { rootMargin: "0px 0px 120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [path]);

  if (path !== "/") return null;
  return (
    <div ref={ref} className={`footer-rise mt-auto ${up ? "is-up" : ""}`}>
      {children}
    </div>
  );
}
