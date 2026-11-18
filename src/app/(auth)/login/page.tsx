import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · Suya Factory" };

// The heading and links are the same for everyone, so they load instantly.
// Anything that reads the web address or the login cookie sits inside
// <Suspense> and streams in a moment later (Next.js 16 "Cache Components").
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">Log in to your Suya Factory account.</p>

      <Suspense fallback={<p className="text-sm text-stone-400">Loading…</p>}>
        <LoginContent searchParams={props.searchParams} />
      </Suspense>

      <p className="mt-6 text-center text-sm text-stone-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-orange-700 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next, error } = await searchParams;
  const returnTo = typeof next === "string" ? next : "/account";

  // Already logged in? Skip the form.
  if (await getCurrentUser()) redirect(returnTo);

  return (
    <>
      {error === "confirm" && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          That confirmation link is invalid or has expired. Try logging in, or sign up again.
        </p>
      )}
      <LoginForm next={returnTo} />
    </>
  );
}
