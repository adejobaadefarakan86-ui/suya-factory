import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";

// Test page: which links open each delivery app DIRECTLY on an Android phone?
// Apps don't publish these "app addresses" (only Uber does), so we try likely
// ones on a real phone. Tap each button with the app installed and note which
// ones open the app. Then src/lib/delivery-companies.ts can use those.
export const metadata = { title: "App link test · Suya Factory admin", robots: { index: false } };

type Candidate = { label: string; href: string };
const intent = (scheme: string, pkg: string) => `intent://open#Intent;scheme=${scheme};package=${pkg};end`;

const APPS: { name: string; pkg: string; schemes: string[] }[] = [
  { name: "Bolt", pkg: "ee.mtakso.client", schemes: ["bolt", "taxify", "mtakso"] },
  { name: "Yango", pkg: "com.yandex.yango", schemes: ["yango", "yandextaxi", "yangotaxi"] },
  { name: "inDrive", pkg: "sinet.startup.inDriver", schemes: ["indriver", "indrive"] },
  { name: "Qargo", pkg: "com.orderqargo", schemes: ["qargo", "orderqargo"] },
  { name: "Chowdeck", pkg: "", schemes: ["chowdeck"] },
];

function candidates(app: (typeof APPS)[number]): Candidate[] {
  return app.schemes.flatMap((s) => [
    ...(app.pkg ? [{ label: `${s} (Android way)`, href: intent(s, app.pkg) }] : []),
    { label: `${s}://`, href: `${s}://` },
  ]);
}

export default function AppLinksTestPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-900">App link test</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading…</p>}>
        <Tests />
      </Suspense>
    </div>
  );
}

async function Tests() {
  await requireStaff("/admin/app-links");
  return (
    <>
      <p className="mt-2 text-stone-700">
        On an <strong>Android phone</strong> with the app installed, tap each button. (Ghana: Yango and Qargo still need testing there.) Write down the ones that
        <strong> open the app</strong> (not the Play Store, not an error), and send them to Claude.
        Come back to this page after each tap.
      </p>
      <div className="mt-6 space-y-6">
        {APPS.map((app) => (
          <section key={app.name} className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="text-lg font-bold text-stone-900">{app.name}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {candidates(app).map((c, i) => (
                <a key={c.href} href={c.href}
                  className="rounded-xl border border-stone-300 px-4 py-3 font-medium text-stone-900 hover:border-orange-500">
                  {app.name} test {i + 1}: <span className="font-mono text-sm">{c.label}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
