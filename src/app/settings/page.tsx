// Settings for everyone (guests too): look, shopping, account, help, legal.
// Look and cart settings are kept on this device; country is a cookie.
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { BUSINESS } from "@/lib/business";
import { CountrySwitcher } from "@/components/country-switcher";
import { ThemeSwitcher } from "@/components/theme";
import { signOut } from "../(auth)/actions";
import { ClearCart, Motion, TextSize } from "./controls";

export const metadata = { title: "Settings · Suya Factory" };

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-medium text-ink">{title}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface px-5">{children}</ul>
    </section>
  );
}

const linkRow = "text-sm font-medium text-accent-strong underline-offset-4 hover:underline";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Settings</h1>
      <p className="mt-2 text-muted">Saved on this device.</p>

      <div className="mt-10 space-y-8">
        <Group title="Appearance">
          <Row title="Theme" hint="System follows your phone or computer."><ThemeSwitcher /></Row>
          <Row title="Text size"><TextSize /></Row>
          <Row title="Animations" hint="Turn off moving effects."><Motion /></Row>
        </Group>

        <Group title="Shopping">
          <Row title="Country" hint="Prices and how you buy depend on it.">
            <Suspense fallback={<span className="h-9 w-28" />}><CountrySwitcher /></Suspense>
          </Row>
          <Row title="Cart"><ClearCart /></Row>
        </Group>

        <Group title="Account">
          <Suspense fallback={<Row title="Account"><span className="h-9" /></Row>}>
            <AccountRows />
          </Suspense>
        </Group>

        <Group title="Help">
          <Row title="Email us" hint={BUSINESS.email}>
            <a href={`mailto:${BUSINESS.email}`} className={linkRow}>Write</a>
          </Row>
          <Row title="Custom and bulk orders" hint="1kg or more, priced with you."><Link href="/bulk-orders" className={linkRow}>Open</Link></Row>
          <Row title="Find a supermarket" hint="Nigeria"><Link href="/where-to-buy" className={linkRow}>Open</Link></Row>
        </Group>

        <Group title="Legal">
          <Row title="Terms of sale"><Link href="/terms" className={linkRow}>Read</Link></Row>
          <Row title="Privacy policy"><Link href="/privacy" className={linkRow}>Read</Link></Row>
        </Group>

        <p className="text-center text-xs text-muted">
          {BUSINESS.legalName} · {BUSINESS.rcNumber}
        </p>
      </div>
    </main>
  );
}

async function AccountRows() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <Row title="Not signed in" hint="Sign in to see your orders.">
          <span className="flex gap-2">
            <Link href="/login" className="btn btn-primary px-4 py-2 text-sm">Log in</Link>
            <Link href="/signup" className="btn btn-ghost px-4 py-2 text-sm">Sign up</Link>
          </span>
        </Row>
      </>
    );
  }
  return (
    <>
      <Row title={user.fullName ?? "My account"} hint={user.email ?? undefined}>
        <Link href="/account" className={linkRow}>My orders</Link>
      </Row>
      <Row title="Log out">
        <form action={signOut}><button className="btn btn-ghost px-4 py-2 text-sm">Log out</button></form>
      </Row>
    </>
  );
}
