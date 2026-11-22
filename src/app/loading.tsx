import { LogoLoader } from "@/components/logo-loader";

// Shown while a page is still on its way (slow connections).
export default function Loading() {
  return (
    <main className="grid flex-1 place-items-center py-24">
      <LogoLoader />
    </main>
  );
}
