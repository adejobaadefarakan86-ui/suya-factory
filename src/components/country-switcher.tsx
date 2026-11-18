import { setCountry } from "@/app/actions/country";
import { getCountry } from "@/lib/country";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

/** Nigeria / Ghana toggle. Reads a cookie, so render it inside <Suspense>. */
export async function CountrySwitcher() {
  const current = await getCountry();

  return (
    <form action={setCountry} className="flex rounded-lg border border-stone-300 p-0.5 text-xs" aria-label="Shopping country">
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
            className={`rounded-md px-2 py-1 font-semibold ${
              active ? "bg-orange-700 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {code} {COUNTRIES[code].symbol}
          </button>
        );
      })}
    </form>
  );
}
