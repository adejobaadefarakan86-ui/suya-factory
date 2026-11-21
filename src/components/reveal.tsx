"use client";
// Fades a section up gently the first time it scrolls into view.
// Visible by default: the hidden start only applies when JavaScript runs and
// the visitor hasn't asked for reduced motion (see globals.css).
import { useEffect, useRef } from "react";

export function Reveal({ children, className = "", as: Tag = "div" }: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-revealed", "");
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // @ts-expect-error -- the ref fits every allowed tag
    <Tag ref={ref} data-reveal="" className={className}>{children}</Tag>
  );
}
