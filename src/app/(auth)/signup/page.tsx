import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account · Suya Factory" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">
        Save your addresses and track your orders. (You can also check out as a guest.)
      </p>

      <Suspense fallback={<p className="text-sm text-stone-400">Loading…</p>}>
        <SignupContent />
      </Suspense>

      <p className="mt-6 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-orange-700 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

async function SignupContent() {
  if (await getCurrentUser()) redirect("/account");
  return <SignupForm />;
}
