import Link from "next/link";

// Temporary home page until the storefront phase.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-stone-900 sm:text-5xl">Suya Factory</h1>
      <p className="mt-3 max-w-md text-stone-600">
        Authentic, flame-grilled suya, delivered across Nigeria and Ghana. Our online shop is
        coming soon.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="rounded-lg bg-orange-700 px-5 py-2.5 font-semibold text-white hover:bg-orange-800">
          Create an account
        </Link>
        <Link href="/login" className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 font-semibold text-stone-700 hover:bg-stone-100">
          Log in
        </Link>
      </div>
    </main>
  );
}
