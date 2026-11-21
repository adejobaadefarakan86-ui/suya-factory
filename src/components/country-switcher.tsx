import { setCountry } from "@/app/actions/country";
import { getCountry } from "@/lib/country";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

/** Nigeria / Ghana toggle. Reads a cookie, so render it inside <Suspense>. */
export async function CountrySwitcher() {
  const current = await getCountry();

  return (
    <form action={setCountry} className="flex rounded-xl border border-line bg-surface p-1 text-xs" aria-label="Shopping country">
      {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => {
        const active = code === current;
        return (
          <button
            key={code}
            type="submit"
            name="country"
            value={code}
            aria-pressed={active}
            title={`Shop in ${COUNTRIES[code].name}`}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              active ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {code} {COUNTRIES[code].symbol}
          </button>
        );
      })}
    </form>
  );
}
