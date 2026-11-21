import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account · Suya Factory" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-center font-display text-3xl font-semibold tracking-tight">Join Suya Factory</h1>
      <p className="mb-7 mt-2 text-center text-sm text-white/80">
        Track your orders and check out faster. You can still order as a guest.
      </p>

      <Suspense fallback={<p className="text-center text-sm text-white/80">Loading…</p>}>
        <SignupContent />
      </Suspense>

      <p className="mt-7 text-center text-sm text-white/80">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
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
