// Home page, in this order: a short opening about us with the main button in
// the middle, "Definitely not your ordinary kilishi", our kilishi, what's
// coming, custom orders. Real photos only, kept inside the page (never edge to edge).
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";
import { OrderBarForPage } from "@/components/quick-order";
import { MaskHeading, Reveal } from "@/components/reveal";
import { HeroDone } from "@/components/hero-done";
import { Flame, Sparks, Squiggle, Swirl } from "@/components/doodles";
import { getCountry } from "@/lib/country";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { SOCIAL } from "@/lib/business";

const wrap = "mx-auto w-full max-w-6xl px-4";
const delay = (d: number) => ({ "--d": `${d}s` }) as React.CSSProperties;

export default function HomePage() {
  return (
    <main className="flex-1 overflow-x-clip">
      <Hero />
      <Highlights />

      {/* Our kilishi (the main button jumps here in Ghana) */}
      <section id="kilishi" className="scroll-mt-20 bg-cream py-20 sm:py-24">
        <div className={wrap}>
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">The one and only</p>
              <MaskHeading lines={["Our beef kilishi"]} className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl" />
            </div>
            <Flame className="flicker hidden h-12 w-10 text-accent sm:block" />
          </Reveal>
          <Reveal>
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid />
            </Suspense>
          </Reveal>
        </div>
      </section>

      <ComingSoon />
      <CustomOrders />

      {/* Phones: "Order now" bar once you scroll past the top. */}
      <Suspense fallback={null}>
        <OrderBarForPage orderHref="#kilishi" />
      </Suspense>
    </main>
  );
}

// ---------------------------------------------------------------------------

/** Short and about us; the main button sits in the middle. */
function Hero() {
  const words = ["No", "rules,", "just", "bite."];
  return (
    <section className="relative overflow-hidden bg-cream">
      <HeroDone />
      {/* Soft orange and yellow glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--sun)_40%,transparent),transparent_65%)]" />
        <div className="absolute -bottom-48 -left-40 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_65%)]" />
      </div>
      <Sparks className="twinkle absolute right-[8%] top-16 hidden h-10 w-10 text-ink/60 sm:block" />
      <Swirl className="absolute left-[5%] top-24 hidden h-10 w-28 text-ink/40 lg:block" />

      <div className={`${wrap} relative flex flex-col items-center py-14 text-center sm:py-20`}>
        <p style={delay(0)} className="hero-in inline-flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted">
          <Flame className="flicker h-4 w-3.5 text-accent" />
          Spicy beef kilishi · Made in Nigeria
        </p>

        {/* One line, the words arriving one after another */}
        <h1 className="mt-6 whitespace-nowrap font-display text-[clamp(2.1rem,9vw,5.5rem)] font-semibold leading-none tracking-tight text-ink">
          {words.map((w, i) => (
            <span key={w} style={delay(0.08 + i * 0.12)} className={`hero-in inline-block ${i < words.length - 1 ? "mr-[0.25em]" : "relative"}`}>
              {w}
              {i === words.length - 1 && <Squiggle className="draw absolute -bottom-3 left-0 h-3.5 w-full text-accent" />}
            </span>
          ))}
        </h1>

        <p style={delay(0.6)} className="hero-in mt-8 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          We&apos;re Suya Factory. We make spicy beef kilishi in a clean, hygienic kitchen and seal every pack fresh.
          Soft and crunchy in every piece, from Lagos to Accra.
        </p>

        {/* The main button, in the middle */}
        <div style={delay(0.75)} className="hero-in mt-8 flex flex-col items-center gap-3">
          <Suspense fallback={<span className="btn btn-primary px-8 py-4 text-base opacity-60">Order now</span>}>
            <HeroButton />
          </Suspense>
          <Link href="/bulk-orders" className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            or ask about custom orders
          </Link>
        </div>

        {/* The plate, seen from above: a round photo on a warm orange disc, with a thin
            orbit ring and a small flame sticker. Kept inside the page, never edge to edge. */}
        <div style={delay(0.9)} className="hero-in relative mt-14 aspect-square w-full max-w-[17rem] sm:max-w-sm">
          {/* orange disc, offset, with a soft glow */}
          <div aria-hidden="true"
            className="tilt-in absolute inset-0 translate-x-5 translate-y-5 scale-[1.04] rounded-full bg-[radial-gradient(circle_at_30%_25%,var(--sun),var(--accent)_55%,var(--accent-strong))] shadow-[0_40px_80px_-30px_color-mix(in_srgb,var(--accent)_80%,transparent)]" />
          {/* thin orbit ring */}
          <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] text-accent/60">
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="currentColor" strokeWidth="0.35" strokeDasharray="1.2 2.2" />
          </svg>
          {/* the plate */}
          <div className="relative h-full w-full overflow-hidden rounded-full ring-[6px] ring-bg shadow-[0_25px_50px_-25px_rgba(60,25,5,0.6)]">
            <Image src="/images/kilishi-plate.jpg" alt="Suya Factory beef kilishi on a white plate, coated in red pepper spice"
              width={1080} height={1078} priority sizes="(min-width: 640px) 384px, 272px"
              className="h-full w-full scale-[1.12] object-cover" />
          </div>
          {/* flame sticker */}
          <span className="absolute -right-2 bottom-6 flex items-center gap-1.5 rounded-full bg-night py-2 pl-2.5 pr-3.5 text-xs font-semibold text-on-night shadow-lg sm:-right-6">
            <Flame className="flicker h-4 w-3.5 text-accent" />
            Seriously spicy
          </span>
        </div>
      </div>
    </section>
  );
}

// The main button follows the visitor's country (a cookie) and account.
async function HeroButton() {
  const [country, user] = await Promise.all([getCountry(), getCurrentUser()]);
  if (SELLS_VIA_SUPERMARKETS[country]) {
    return <Link href="/where-to-buy" className="btn btn-primary px-8 py-4 text-base">Find the nearest supermarket</Link>;
  }
  return (
    <a href="#kilishi" className="btn btn-primary px-8 py-4 text-base">
      {isStaff(user) ? "See our kilishi" : "Order now"}
    </a>
  );
}

// ---------------------------------------------------------------------------

const HIGHLIGHTS = [
  { title: "Halal beef", text: "Every pack is made with halal beef." },
  { title: "Soft meets crunchy", text: "Tender inside, crisp at the edges, spice in every bite." },
  { title: "Clean kitchen", text: "Prepared in a clean, hygienic kitchen and packed by hand." },
  { title: "Keeps for 3 months", text: "Sealed fresh. Store it somewhere cool and dry." },
];

function Highlights() {
  return (
    <section className="bg-bg py-20 sm:py-24">
      <div className={`${wrap} grid items-center gap-12 md:grid-cols-[0.8fr_1.2fr]`}>
        <Reveal variant="image" className="mx-auto w-full max-w-[17rem] rounded-[1.5rem] md:max-w-sm">
          <div className="overflow-hidden rounded-[1.5rem]">
            <Image src="/images/kitchen-packing.jpg" alt="A Suya Factory team member in a hairnet and mask packing kilishi into sealed tubs"
              width={719} height={890} sizes="(min-width: 768px) 384px, 272px" className="aspect-[4/5] w-full object-cover" />
          </div>
        </Reveal>
        <div>
          <MaskHeading lines={["Definitely not your", "ordinary kilishi"]}
            className="max-w-md font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl" />
          <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {HIGHLIGHTS.map((h, i) => (
              <Reveal as="li" key={h.title} variant="line" index={i} className="pt-5">
                <h3 className="font-display text-xl font-semibold text-ink">{h.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{h.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** What's next: a teaser only. No names, photos or products. */
function ComingSoon() {
  return (
    <section className="relative overflow-hidden bg-night text-on-night">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_55%,transparent),transparent_70%)] blur-2xl" />
        <div className="absolute -right-16 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--sun)_40%,transparent),transparent_70%)] blur-2xl" />
        <svg viewBox="0 0 400 400" className="absolute right-[6%] top-1/2 hidden h-[26rem] w-[26rem] -translate-y-1/2 text-on-night/15 md:block">
          {[70, 110, 150, 190].map((r) => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1" />)}
          {[0, 1.5, 3].map((d) => (
            <circle key={d} className="ripple" style={delay(d)} cx="200" cy="200" r="120" fill="none" stroke="var(--accent)" strokeWidth="1" />
          ))}
          <circle cx="200" cy="200" r="30" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        </svg>
      </div>
      <div className={`${wrap} relative py-24 sm:py-32`}>
        <Reveal className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sun">Coming soon</p>
          <MaskHeading lines={["Something new", "is simmering."]}
            className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl" />
          <p className="mt-5 text-lg leading-relaxed text-night-muted">
            The kitchen never really closes. More from Suya Factory is on the way. No spoilers yet.
          </p>
          <Suspense fallback={null}>
            <FollowLink />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
}

async function FollowLink() {
  const instagram = SOCIAL[await getCountry()].find((s) => s.name === "Instagram");
  if (!instagram) return null;
  return (
    <a href={instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-night mt-8 px-6 py-3.5 text-base">
      Be the first to know
    </a>
  );
}

// ---------------------------------------------------------------------------

function CustomOrders() {
  return (
    <section className="bg-bg py-20 sm:py-24">
      <div className={wrap}>
        <Reveal className="grid items-center gap-8 rounded-[1.75rem] border border-line bg-surface p-4 sm:p-6 md:grid-cols-2 md:gap-10">
          <Reveal variant="image" className="relative mx-auto aspect-[4/3] w-full max-w-md rounded-[1.25rem]">
            <Image src="/images/kilishi-tubs.webp" alt="Suya Factory kilishi in sealed tubs" fill
              sizes="(min-width: 768px) 448px, 90vw" className="object-cover" />
          </Reveal>
          <div className="px-2 pb-4 md:px-0 md:pb-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Custom orders</p>
            <MaskHeading lines={["Planning a party, an event,", "or stocking your shop?"]} className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink" />
            <p className="mt-3 leading-relaxed text-muted">
              Order 1kg or more, with custom packaging if you need it. We&apos;ll agree the price with you directly.
            </p>
            <div className="mt-7">
              <Link href="/bulk-orders" className="btn btn-primary px-6 py-3.5 text-base">Ask about a custom order</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
