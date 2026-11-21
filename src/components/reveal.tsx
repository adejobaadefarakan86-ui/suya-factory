"use client";
// Scroll reveals, played once when a section comes into view:
//   "rise"  : text lifts gently into place (default)
//   "mask"  : a heading slides up from behind a hidden edge, line by line
//   "image" : a photo opens out from a rounded frame while it settles from a slight zoom
//   "line"  : a rule draws itself left to right, then its content follows
// Visible by default: the hidden start only applies when JavaScript runs and the
// visitor hasn't asked for less motion (globals.css). `index` staggers siblings.
import { useEffect, useRef } from "react";

type Variant = "rise" | "mask" | "image" | "line";

export function Reveal({ children, className = "", as: Tag = "div", variant = "rise", index = 0 }: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "h2" | "h1" | "p";
  variant?: Variant;
  index?: number;
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
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // @ts-expect-error -- the ref fits every allowed tag
    <Tag ref={ref} data-reveal={variant} className={className} style={{ "--i": index } as React.CSSProperties}>
      {children}
    </Tag>
  );
}

/** A heading whose lines slide up from behind a hidden edge. Pass each line as a string. */
export function MaskHeading({ lines, className = "", as = "h2" }: { lines: string[]; className?: string; as?: "h1" | "h2" }) {
  return (
    <Reveal as={as} variant="mask" className={className}>
      {lines.map((l, i) => (
        <span key={l} className="rv-mask">
          <span className="rv-line" style={{ "--l": i } as React.CSSProperties}>{l}</span>
        </span>
      ))}
    </Reveal>
  );
}
