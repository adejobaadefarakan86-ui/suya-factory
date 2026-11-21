// Home page: hero, the kilishi, why it's good, how buying works (by country),
// a teaser for what's next, and bulk orders. Real photos only.
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";
import { HeroOrder, OrderBarForPage } from "@/components/quick-order";
import { Reveal } from "@/components/reveal";
import { Cow, Flame, Sparks, Squiggle, Swirl } from "@/components/doodles";
import { getCountry } from "@/lib/country";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { SOCIAL } from "@/lib/business";

const wrap = "mx-auto w-full max-w-6xl px-4";

export default function HomePage() {
  return (
    <main className="flex-1 overflow-x-clip">
      <Hero />

      {/* The kilishi */}
      <section className="bg-bg py-20 sm:py-24">
        <div className={wrap}>
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">The one and only</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Our beef kilishi</h2>
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

      <Highlights />

      <section id="how-it-works" className="scroll-mt-20 bg-bg py-20 sm:py-24">
        <Suspense fallback={<div className="h-64" />}>
          <HowItWorks />
        </Suspense>
      </section>

      <ComingSoon />
      <BulkBand />

      {/* Phones: "Order now" bar once you scroll past the top. */}
      <Suspense fallback={null}>
        <OrderBarForPage orderHref="#order" />
      </Suspense>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative bg-cream">
      {/* Soft orange-to-yellow glow, top right */}
      <div aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--sun)_45%,transparent),transparent_65%)] opacity-70" />
      <div className={`${wrap} relative grid items-center gap-12 py-7 sm:py-20 md:grid-cols-[1.05fr_1fr] md:py-24`}>
        <div>
          <p className="hero-in inline-flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted">
            <Flame className="flicker h-4 w-3.5 text-accent" />
            Spicy beef kilishi · Lagos &amp; Accra
          </p>
          <h1 style={{ "--d": "0.08s" } as React.CSSProperties} className="hero-in mt-4 font-display text-[2.6rem] font-semibold sm:mt-6 sm:text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl lg:text-7xl">
            No rules,
            <br />
            <span className="relative inline-block">
              just bite.
              <Squiggle className="draw absolute -bottom-3 left-0 h-4 w-full text-accent" />
            </span>
          </h1>
          <p style={{ "--d": "0.16s" } as React.CSSProperties} className="hero-in mt-5 max-w-md leading-relaxed text-muted sm:mt-7 sm:text-lg">
            Soft and crunchy in every piece. Prepared in a clean kitchen, sealed fresh, and seriously spicy.
          </p>
          {/* Order straight from the first screen: no scrolling needed. */}
          <div style={{ "--d": "0.24s" } as React.CSSProperties} className="hero-in">
            <Suspense fallback={<div className="mt-8 h-44 max-w-md animate-pulse rounded-2xl bg-surface" />}>
              <HeroOrder />
            </Suspense>
          </div>
          <a href="#how-it-works" className="mt-4 inline-block text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            How it works
          </a>
        </div>

        <div className="relative mx-auto w-full max-w-lg md:max-w-none">
          {/* Abstract shape behind the photo */}
          <div aria-hidden="true"
            className="tilt-in absolute -inset-4 -z-0 rotate-3 rounded-[2.25rem] bg-gradient-to-br from-accent via-[color-mix(in_srgb,var(--accent)_60%,var(--sun))] to-sun opacity-90" />
          <div className="relative overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-30px_rgba(60,25,5,0.55)]">
            <Image src="/images/kilishi-plate.jpg" alt="Suya Factory beef kilishi on a white plate, coated in red pepper spice"
              width={1080} height={1078} priority sizes="(min-width: 768px) 560px, 100vw"
              className="aspect-[5/4] w-full object-cover" />
          </div>
          <p className="absolute -bottom-5 left-5 flex items-center gap-2.5 rounded-xl border border-line bg-surface py-2 pl-2.5 pr-4 text-sm font-medium text-ink shadow-sm">
            <Cow className="h-8 w-8 text-ink" />
            <span>Halal beef<span className="block text-xs font-normal text-muted">Sealed fresh</span></span>
          </p>
          <Sparks className="twinkle absolute -right-3 -top-9 h-10 w-10 text-ink/70" />
          <Swirl className="absolute -left-14 top-8 hidden h-10 w-28 text-ink/50 lg:block" />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

const HIGHLIGHTS = [
  { title: "Halal beef", text: "Every pack is made with halal beef." },
  { title: "Soft meets crunchy", text: "Tender inside, crisp at the edges, spice in every bite." },
  { title: "Clean kitchen", text: "Prepared in a clean, hygienic kitchen and packed with care." },
  { title: "Keeps for 3 months", text: "Sealed fresh. Store it somewhere cool and dry." },
];

function Highlights() {
  return (
    <section className="bg-cream py-20 sm:py-24">
      <div className={`${wrap} grid items-center gap-12 md:grid-cols-[0.9fr_1.1fr]`}>
        <Reveal className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div className="overflow-hidden rounded-[1.5rem]">
            <Image src="/images/kitchen-packing.jpg" alt="A Suya Factory team member in a hairnet and mask packing kilishi into sealed tubs"
              width={719} height={890} sizes="(min-width: 768px) 440px, 90vw" className="aspect-[4/5] w-full object-cover" />
          </div>
          <p className="absolute -bottom-4 right-4 rounded-xl bg-night px-4 py-2 text-sm font-medium text-on-night">Packed by hand, sealed fresh</p>
        </Reveal>
        <div>
          <Reveal>
            <h2 className="max-w-md font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Definitely not your ordinary kilishi
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <Reveal as="li" key={h.title} className="border-t-2 border-ink pt-4">
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

async function HowItWorks() {
  const steps = SELLS_VIA_SUPERMARKETS[await getCountry()]
    ? [
        ["Find a supermarket", "We show you the nearest supermarket that has our kilishi in stock."],
        ["Buy from them", "Call or WhatsApp the supermarket, pay them, and they keep your pack ready."],
        ["Send a rider", "Book a rider in Bolt or inDrive with the details we give you. Or pick it up yourself."],
      ]
    : [
        ["Pick your pack", "Small pack or big pack. Delivery inside Greater Accra."],
        ["Pay by MoMo", "Send Mobile Money to our number and tap “I've paid”. We confirm it quickly."],
        ["Book your rider", "Use Bolt, Uber, Yango or Qargo to collect it from us. You pay the rider."],
      ];
  return (
    <div className={wrap}>
      <Reveal className="flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">How it works</h2>
        <Link href="/bulk-orders" className="text-sm font-medium text-accent hover:underline">Need 1kg or more?</Link>
      </Reveal>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map(([title, text], i) => (
          <Reveal as="li" key={title} className="rounded-2xl border border-line bg-surface p-6">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft font-display font-semibold text-accent">{i + 1}</span>
            <h3 className="mt-5 font-display text-xl font-semibold text-ink">{title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </ol>
    </div>
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
        {/* Thin rings, like ripples in a pot */}
        <svg viewBox="0 0 400 400" className="absolute right-[6%] top-1/2 hidden h-[26rem] w-[26rem] -translate-y-1/2 text-on-night/15 md:block">
          {[70, 110, 150, 190].map((r) => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1" />)}
          {[0, 1.5, 3].map((d) => (
            <circle key={d} className="ripple" style={{ "--d": `${d}s` } as React.CSSProperties}
              cx="200" cy="200" r="120" fill="none" stroke="var(--accent)" strokeWidth="1" />
          ))}
          <circle cx="200" cy="200" r="30" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        </svg>
      </div>
      <div className={`${wrap} relative py-24 sm:py-32`}>
        <Reveal className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sun">Coming soon</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Something new is simmering.
          </h2>
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

function BulkBand() {
  return (
    <section className="bg-bg py-20 sm:py-24">
      <div className={wrap}>
        <Reveal className="grid overflow-hidden rounded-[1.75rem] border border-line bg-surface md:grid-cols-2">
          <div className="relative min-h-64">
            <Image src="/images/kilishi-tubs.webp" alt="Suya Factory kilishi in sealed tubs" fill
              sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">Buying for a party, office or shop?</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Order 1kg or more and we&apos;ll agree the price with you directly. Chat with us on WhatsApp, call, or send an enquiry.
            </p>
            <div className="mt-7">
              <Link href="/bulk-orders" className="btn btn-primary px-6 py-3.5 text-base">Ask about bulk orders</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
