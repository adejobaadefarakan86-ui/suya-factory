"use client";
// Nigeria: find the nearest supermarket that has our kilishi, then
//   1. call / WhatsApp it, pay the supermarket, wait for them to confirm
//   2. "Is your kilishi ready?" check
//   3. book a rider with a delivery company (pickup = the supermarket)
//   4. send the rider's details to the supermarket on WhatsApp, with a pickup code
// Progress is remembered in this browser for a few hours, because customers
// leave the page to call, pay and book the rider.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LocationPicker, type PickedLocation } from "@/app/checkout/location-picker";
import { formatPhone, telLink, whatsappLink } from "@/lib/contacts";
import { appLink, DELIVERY_COMPANIES } from "@/lib/delivery-companies";
import { DeliveryDetails, type DetailRow } from "@/components/delivery-details";
import { localPhone } from "@/lib/contacts";
import { directionsLink, mapPinLink, roadKm, storeTitle, type Store } from "@/lib/stores";
import { logPickup, reportOutOfStock } from "./actions";

type Step = "list" | "contact" | "rider" | "send";

type RiderForm = {
  customerName: string;
  customerPhone: string;
  paidFrom: string;
  riderName: string;
  riderPhone: string;
  riderPlate: string;
  deliveryCompany: string;
};

type Saved = {
  at: number;
  location: PickedLocation | null;
  storeId: string | null;
  step: Step;
  form: RiderForm;
  code: string | null;
};

const SAVE_KEY = "sf_store_finder";
const KEEP_FOR_MS = 6 * 60 * 60 * 1000;

const EMPTY_FORM: RiderForm = {
  customerName: "",
  customerPhone: "",
  paidFrom: "",
  riderName: "",
  riderPhone: "",
  riderPlate: "",
  deliveryCompany: "",
};

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return Date.now() - saved.at < KEEP_FOR_MS ? saved : null;
  } catch {
    return null;
  }
}

const input =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200";

// Saved progress lives in this browser only, so wait until the page is running
// in the browser before showing the finder.
const noSubscribe = () => () => {};

export function StoreFinder({ stores, askFor }: { stores: Store[]; askFor: string }) {
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!inBrowser) return <div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-200" />;
  return <Finder stores={stores} askFor={askFor} saved={loadSaved()} />;
}

function Finder({ stores, askFor, saved }: { stores: Store[]; askFor: string; saved: Saved | null }) {
  // Pick up where the customer left off (after calling the store, paying, booking…).
  const resume = saved?.storeId && stores.some((s) => s.id === saved.storeId) ? saved : null;
  const [location, setLocation] = useState<PickedLocation | null>(saved?.location ?? null);
  const [storeId, setStoreId] = useState<string | null>(resume?.storeId ?? null);
  const [step, setStep] = useState<Step>(resume?.step ?? "list");
  const [form, setForm] = useState<RiderForm>({ ...EMPTY_FORM, ...saved?.form });
  const [code, setCode] = useState<string | null>(resume?.code ?? null);

  useEffect(() => {
    try {
      const saved: Saved = { at: Date.now(), location, storeId, step, form, code };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {
      // Private browsing etc.: the page still works, it just won't remember.
    }
  }, [location, storeId, step, form, code]);

  // In stock first, nearest first; out-of-stock stores at the end.
  const sorted = useMemo(() => {
    const withKm = stores.map((s) => ({ store: s, km: location ? roadKm(location, s) : null }));
    return withKm.sort((a, b) => {
      if (a.store.inStock !== b.store.inStock) return a.store.inStock ? -1 : 1;
      if (a.km !== null && b.km !== null) return a.km - b.km;
      return a.store.name.localeCompare(b.store.name);
    });
  }, [stores, location]);

  const chosen = sorted.find((x) => x.store.id === storeId) ?? null;

  function go(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startOver() {
    setStoreId(null);
    setCode(null);
    setForm((f) => ({ ...EMPTY_FORM, customerName: f.customerName, customerPhone: f.customerPhone }));
    go("list");
  }

  if (stores.length === 0) {
    return (
      <p className="mt-6 rounded-2xl bg-amber-50 p-5 text-amber-900">
        We&apos;re adding the supermarkets that sell our kilishi. Please check back soon, or chat with us on WhatsApp.
      </p>
    );
  }

  if (chosen && step !== "list") {
    return (
      <div className="mt-6 space-y-6">
        <button type="button" onClick={() => go(step === "contact" ? "list" : step === "rider" ? "contact" : "rider")}
          className="text-sm text-stone-600 hover:text-orange-700">
          ← Back
        </button>
        <StepDots step={step} />
        {step === "contact" && (
          <ContactStep store={chosen.store} km={chosen.km} askFor={askFor} onReady={() => go("rider")} />
        )}
        {step === "rider" && (
          <RiderStep
            store={chosen.store}
            form={form}
            setForm={setForm}
            onDone={(c) => {
              setCode(c);
              go("send");
            }}
          />
        )}
        {step === "send" && code && <SendStep store={chosen.store} form={form} code={code} onStartOver={startOver} />}
      </div>
    );
  }

  const nearestOverall = location
    ? [...sorted].filter((x) => x.km !== null).sort((a, b) => a.km! - b.km!)[0]
    : null;
  const firstInStock = sorted.find((x) => x.store.inStock);

  return (
    <div className="mt-6 space-y-5">
      <LocationPicker
        country="NG"
        value={location}
        onChange={setLocation}
        emptyTitle="Where are you?"
        emptyHint="Use your location to see the nearest supermarket first"
      />

      {nearestOverall && !nearestOverall.store.inStock && firstInStock && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          The nearest supermarket, <strong>{storeTitle(nearestOverall.store)}</strong>, is out of kilishi right now.{" "}
          <strong>{storeTitle(firstInStock.store)}</strong> is the next nearest that has it.
        </p>
      )}

      <ul className="space-y-4">
        {sorted.map(({ store, km }, i) => (
          <StoreCard
            key={store.id}
            store={store}
            km={km}
            best={i === 0 && store.inStock && location !== null}
            askFor={askFor}
            onChoose={() => {
              setStoreId(store.id);
              setCode(null);
              go("contact");
            }}
          />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StepDots({ step }: { step: Step }) {
  const steps: [Step, string][] = [["contact", "Order & pay"], ["rider", "Book a rider"], ["send", "Send rider details"]];
  const at = steps.findIndex(([s]) => s === step);
  return (
    <ol className="flex gap-2 text-xs font-medium">
      {steps.map(([s, label], i) => (
        <li key={s} className={`flex-1 rounded-full px-3 py-1.5 text-center ${i <= at ? "bg-orange-700 text-white" : "bg-stone-200 text-stone-600"}`}>
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function kmText(km: number | null) {
  if (km === null) return null;
  return km < 1 ? "under 1 km away" : `about ${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

function enquiryMessage(store: Store, askFor: string) {
  return `Hello ${storeTitle(store)}, I'd like to buy Suya Factory Beef Kilishi (${askFor}). Do you have it in stock? How much is it, and how can I pay?`;
}

function StoreCard({
  store,
  km,
  best,
  askFor,
  onChoose,
}: {
  store: Store;
  km: number | null;
  best: boolean;
  askFor: string;
  onChoose: () => void;
}) {
  const [report, setReport] = useState<"idle" | "sending" | "done">("idle");
  const distance = kmText(km);

  return (
    <li className={`rounded-2xl border bg-white p-5 ${store.inStock ? "border-stone-200" : "border-stone-200 opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-stone-900">{storeTitle(store)}</h3>
            {best && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Nearest</span>}
            {!store.inStock && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Out of stock</span>}
          </div>
          <p className="mt-1 text-sm text-stone-600">{store.address}</p>
          <p className="mt-1 text-sm text-stone-500">
            {[distance, store.openingHours].filter(Boolean).join(" · ")}
          </p>
          {store.packs && <p className="mt-1 text-sm text-stone-700">{store.packs}</p>}
          {store.inStock && store.outReportedAt && (
            <p className="mt-1 text-xs text-amber-700">A customer recently said they may have run out. Please call to check.</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {store.phone ? (
          <a href={telLink(store.phone)} className="rounded-lg border border-stone-300 px-3 py-2 text-center font-medium text-stone-800 hover:bg-stone-50">📞 Call</a>
        ) : <span />}
        {store.whatsapp ? (
          <a href={whatsappLink(store.whatsapp, enquiryMessage(store, askFor))} target="_blank" rel="noopener noreferrer"
            className="rounded-lg border border-green-600 px-3 py-2 text-center font-medium text-green-700 hover:bg-green-50">💬 WhatsApp</a>
        ) : <span />}
        <a href={directionsLink(store)} target="_blank" rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 px-3 py-2 text-center font-medium text-stone-800 hover:bg-stone-50">🧭 Directions</a>
      </div>

      {store.inStock && (
        <>
          <button type="button" onClick={onChoose}
            className="mt-3 w-full rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800">
            Buy from this supermarket →
          </button>
          <div className="mt-2 text-center text-xs">
            {report === "done" ? (
              <span className="text-stone-500">Thanks for telling us. We&apos;ll check with the supermarket.</span>
            ) : (
              <button type="button" disabled={report === "sending"} className="text-stone-500 underline hover:text-stone-700"
                onClick={async () => {
                  setReport("sending");
                  await reportOutOfStock(store.id);
                  setReport("done");
                }}>
                They told you they&apos;re out of kilishi?
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------

function ContactStep({ store, km, askFor, onReady }: { store: Store; km: number | null; askFor: string; onReady: () => void }) {
  const [checks, setChecks] = useState([false, false, false]);
  const [notYet, setNotYet] = useState(false);
  const all = checks.every(Boolean);
  const items = [
    "I've called the supermarket and they have my pack",
    "I've paid them, and they've confirmed they received my payment",
    "I have the name of the staff member holding my order",
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-sm text-stone-500">You&apos;re buying from</p>
        <h2 className="text-xl font-bold text-stone-900">{storeTitle(store)}</h2>
        <p className="mt-1 text-sm text-stone-600">{store.address}{km !== null ? ` · ${kmText(km)}` : ""}</p>

        <ol className="mt-5 space-y-4 text-sm text-stone-700">
          <li>
            <p className="font-semibold text-stone-900">1. Call or WhatsApp the supermarket</p>
            <p>Ask for <strong>Suya Factory Beef Kilishi</strong> ({askFor}) and say how many packs you want. They&apos;ll tell you the price and their account number.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {store.phone && (
                <a href={telLink(store.phone)} className="rounded-lg border border-stone-300 px-3 py-2 font-medium hover:bg-stone-50">
                  📞 Call {formatPhone(store.phone)}
                </a>
              )}
              {store.whatsapp && (
                <a href={whatsappLink(store.whatsapp, enquiryMessage(store, askFor))} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700">💬 WhatsApp the supermarket</a>
              )}
            </div>
          </li>
          <li>
            <p className="font-semibold text-stone-900">2. Pay the supermarket</p>
            <p>Pay into the supermarket&apos;s account, then wait for them to confirm they&apos;ve received it. Suya Factory doesn&apos;t take this payment.</p>
          </li>
        </ol>
      </section>

      <section className="rounded-2xl border-2 border-orange-200 bg-orange-50/50 p-5">
        <h2 className="text-lg font-bold text-stone-900">Is your kilishi ready for pickup?</h2>
        <p className="mt-1 text-sm text-stone-600">Before you book a rider, make sure:</p>
        <div className="mt-3 space-y-2">
          {items.map((text, i) => (
            <label key={text} className="flex items-start gap-3 rounded-lg bg-white p-3 text-sm text-stone-800">
              <input type="checkbox" checked={checks[i]} className="mt-0.5 h-4 w-4 accent-orange-700"
                onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
              <span>{text}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={!all} onClick={onReady}
            className="rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800 disabled:opacity-50">
            Yes, it&apos;s ready: choose a rider
          </button>
          <button type="button" onClick={() => setNotYet(true)}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 font-semibold text-stone-800 hover:bg-stone-50">
            Not yet
          </button>
        </div>
        {notYet && (
          <p className="mt-3 text-sm text-stone-700">
            No problem. Call the supermarket, pay, and come back to this page when they&apos;ve confirmed. We&apos;ll remember where you were.
          </p>
        )}
        <p className="mt-4 text-sm text-stone-600">
          Picking it up yourself?{" "}
          <a href={directionsLink(store)} target="_blank" rel="noopener noreferrer" className="font-medium text-orange-700 underline">Get directions</a>
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function pickupText(store: Store) {
  return `${storeTitle(store)}, ${store.address}`;
}

function RiderStep({
  store,
  form,
  setForm,
  onDone,
}: {
  store: Store;
  form: RiderForm;
  setForm: (f: RiderForm | ((f: RiderForm) => RiderForm)) => void;
  onDone: (code: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // "Other app…": the customer types the app's name (kept in form.deliveryCompany).
  const [otherApp, setOtherApp] = useState(false);
  const listedApp = DELIVERY_COMPANIES.some((c) => c.id === form.deliveryCompany);
  // Which phone decides the link (app on Android, App Store on iPhone). "" on the server.
  const userAgent = useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => "");
  const onPhone = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const set = (key: keyof RiderForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // What Bolt / inDrive / GIGGo ask for, in their words. Sender = the supermarket, recipient = the customer.
  const name = form.customerName.trim();
  const phone = form.customerPhone.trim();
  const details: DetailRow[] = [
    { label: "Pickup address", pasteInto: "inDrive “From” · Bolt “Pickup”", hint: "Where the rider collects it", value: pickupText(store) },
    { label: "Sender name", pasteInto: "Sender's name (if the app asks)", hint: "The supermarket", value: storeTitle(store) },
    ...(store.phone ? [{ label: "Sender phone", pasteInto: "inDrive “Sender's phone” · Bolt “Sender”", hint: "The rider calls the supermarket at pickup", value: localPhone(store.phone) }] : []),
    { label: "Drop-off address", pasteInto: "inDrive “To” · Bolt “Where to?”", hint: "Type your own address there", value: "Your address", info: true },
    name
      ? { label: "Recipient name", pasteInto: "Recipient's name (if the app asks)", hint: "You", value: name }
      : { label: "Recipient name", value: "Your name (fill it in below to copy it)", info: true },
    phone
      ? { label: "Recipient phone", pasteInto: "inDrive “Recipient's phone” · Bolt “Recipient”", hint: "The rider calls you at drop-off", value: localPhone(phone) }
      : { label: "Recipient phone", value: "Your phone (fill it in below to copy it)", info: true },
    { label: "Item", pasteInto: "inDrive “Order details” / item description", hint: "What's in the package", value: "Food: Suya Factory beef kilishi, already paid (sealed, light, under 1 kg)" },
    { label: "Note for the rider", value: `Collect the Suya Factory kilishi ${name ? `for ${name} ` : ""}from ${storeTitle(store)}. Already paid.` },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Name + phone are typed at the top of this step (outside this form).
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setError("Please fill in your name and phone at the top of this step.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await logPickup({ storeId: store.id, ...form });
    setPending(false);
    if ("error" in result) setError(result.error);
    else onDone(result.code);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-bold text-stone-900">Book a rider to pick it up</h2>
        <p className="mt-1 text-sm text-stone-600">Send it as a <strong>parcel</strong> from the supermarket to you. You pay the rider.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Your name</span>
            <input maxLength={100} value={form.customerName} onChange={set("customerName")} className={input} autoComplete="name" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Your phone</span>
            <input type="tel" maxLength={20} value={form.customerPhone} onChange={set("customerPhone")} className={input} autoComplete="tel" placeholder="0803 000 0000" /></label>
        </div>
        <p className="mt-4 text-sm font-semibold text-stone-800">1. Copy these into your app</p>
        <div className="mt-2">
          <DeliveryDetails rows={details} tips={[
            "inDrive asks you to offer a price: offer a fair price for the distance; the rider can suggest another.",
            "If the app asks who pays: you (the sender) pay, in the app or in cash.",
          ]} />
          <a href={mapPinLink(store)} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-orange-700 underline">See the supermarket on a map</a>
        </div>

        <p className="mt-5 text-sm font-semibold text-stone-800">2. Open your app</p>
        <p className="mt-1 text-xs text-stone-500">Opens the app if you have it. If you see its Play Store / App Store page instead, tap <strong>Open</strong> (or <strong>Install</strong>).</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {DELIVERY_COMPANIES.map((c) => (
            <li key={c.id}>
              <a href={appLink(c, userAgent, { lat: store.lat, lng: store.lng }, null)}
                {...(onPhone ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() => setForm((f) => ({ ...f, deliveryCompany: c.id }))}
                className={`block h-full rounded-xl border p-3 hover:border-orange-400 ${form.deliveryCompany === c.id ? "border-orange-600 bg-orange-50" : "border-stone-200"}`}>
                <span className="block font-semibold text-stone-900">{c.name} ↗</span>
                <span className="mt-0.5 block text-xs text-stone-600">{c.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-bold text-stone-900">3. Booked your rider? Tell the supermarket</h2>
          <p className="mt-1 text-sm text-stone-600">We&apos;ll write the message for you, so the supermarket hands your pack to the right rider.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium text-stone-700">Name on the account you paid from</span>
            <input maxLength={100} value={form.paidFrom} onChange={set("paidFrom")} className={input} placeholder="So the supermarket can match your payment" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Rider&apos;s name</span>
            <input required maxLength={100} value={form.riderName} onChange={set("riderName")} className={input} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Rider&apos;s phone</span>
            <input required type="tel" maxLength={20} value={form.riderPhone} onChange={set("riderPhone")} className={input} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Bike / car plate number <span className="font-normal text-stone-500">(if you have it)</span></span>
            <input maxLength={20} value={form.riderPlate} onChange={set("riderPlate")} className={input} placeholder="e.g. LSR-123-AB" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Delivery app</span>
            <select required value={listedApp ? form.deliveryCompany : otherApp || form.deliveryCompany ? "other" : ""}
              onChange={(e) => {
                const v = e.target.value;
                setOtherApp(v === "other");
                setForm((f) => ({ ...f, deliveryCompany: v === "other" ? "" : v }));
              }} className={input}>
              <option value="">Choose…</option>
              {DELIVERY_COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="other">Other app…</option>
            </select></label>
          {!listedApp && (otherApp || form.deliveryCompany !== "") && (
            <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium text-stone-700">Which app?</span>
              <input required maxLength={50} value={form.deliveryCompany} onChange={set("deliveryCompany")} className={input}
                placeholder="The name of the delivery app you used" /></label>
          )}
        </div>
        <p className="text-xs text-stone-600">
          We need your rider&apos;s name and phone before the supermarket can hand over your kilishi.
        </p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
          {pending ? "Please wait…" : "Next: send to the supermarket"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

function pickupMessage(store: Store, form: RiderForm, code: string) {
  const company = DELIVERY_COMPANIES.find((c) => c.id === form.deliveryCompany)?.name ?? form.deliveryCompany;
  const rider = [form.riderName.trim(), form.riderPhone.trim(), form.riderPlate.trim().toUpperCase()].filter(Boolean).join(", ");
  return [
    `Kilishi pickup – code ${code}`,
    `Customer: ${form.customerName.trim()} (${form.customerPhone.trim()})`,
    form.paidFrom.trim() ? `Paid from: ${form.paidFrom.trim()}` : "",
    `Rider: ${rider}${company ? ` (${company})` : ""}`,
    `The rider is coming to ${storeTitle(store)} to pick up my Suya Factory kilishi. Please hand it over only to this rider; they will say the code ${code}.`,
  ].filter(Boolean).join("\n");
}

function SendStep({ store, form, code, onStartOver }: { store: Store; form: RiderForm; code: string; onStartOver: () => void }) {
  const message = pickupMessage(store, form, code);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this message:", message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-center">
        <p className="text-sm text-stone-600">Your pickup code</p>
        <p className="mt-1 text-4xl font-extrabold tracking-wider text-stone-900">{code}</p>
        <p className="mt-2 text-sm text-stone-600">Tell your rider to say this code at the supermarket counter.</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-bold text-stone-900">Send this to {storeTitle(store)}</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 font-sans text-sm text-stone-800">{message}</pre>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {store.whatsapp && (
            <a href={whatsappLink(store.whatsapp, message)} target="_blank" rel="noopener noreferrer"
              className="rounded-lg bg-green-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-green-700">💬 Send on WhatsApp</a>
          )}
          {store.phone && (
            // "?&body=" works on both Android and iPhone.
            <a href={`sms:+${store.phone}?&body=${encodeURIComponent(message)}`}
              className="rounded-lg border border-stone-300 px-4 py-2.5 text-center font-semibold text-stone-800 hover:bg-stone-50">✉️ Send as text message</a>
          )}
          <button type="button" onClick={copy}
            className="rounded-lg border border-stone-300 px-4 py-2.5 font-semibold text-stone-800 hover:bg-stone-50">
            {copied ? "✓ Copied" : "Copy message"}
          </button>
          {store.phone && (
            <a href={telLink(store.phone)} className="rounded-lg border border-stone-300 px-4 py-2.5 text-center font-semibold text-stone-800 hover:bg-stone-50">📞 Call the supermarket</a>
          )}
        </div>
      </section>

      <p className="text-center text-sm text-stone-600">
        Enjoy your kilishi! 🌶️{" "}
        <button type="button" onClick={onStartOver} className="font-medium text-orange-700 underline">Buy again</button>
      </p>
    </div>
  );
}
