"use client";
// Back arrow for the phone app (no browser back button when it's opened from
// the home screen). Hidden on the home page. Goes to the previous page, or home
// if there isn't one (e.g. the app was opened straight onto this page).
import { usePathname, useRouter } from "next/navigation";

export function BackButton({ tone = "page" }: { tone?: "page" | "night" }) {
  const path = usePathname();
  const router = useRouter();
  if (path === "/") return null;
  return (
    <button type="button" aria-label="Go back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className={`-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl transition md:hidden ${tone === "night" ? "text-white hover:bg-white/10" : "text-ink hover:bg-cream"}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
