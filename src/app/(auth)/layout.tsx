// Shared frame for /login and /signup: brand orange with warm glows and a few
// doodles, and a frosted-glass card in the middle (the (auth) folder name in
// brackets groups these pages without adding "/auth" to the web address).
import { LogoMark } from "@/components/logo-mark";
import { Flame, Sparks, Swirl } from "@/components/doodles";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-ember relative flex flex-1 items-center justify-center overflow-hidden px-4 py-14">
      {/* Soft shapes behind the glass */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-1/3 h-64 w-64 rounded-full bg-gold/35 blur-3xl" />
        <div className="absolute -right-10 top-10 h-72 w-72 rounded-full bg-crimson/45 blur-3xl" />
        <Swirl className="absolute left-[6%] top-[12%] hidden h-12 w-32 text-white/35 sm:block" />
        <Sparks className="absolute right-[10%] top-[18%] h-10 w-10 text-white/50" />
        <Flame className="absolute bottom-[10%] left-[12%] h-14 w-11 text-white/30" />
      </div>

      <div className="relative w-full max-w-md rounded-[1.75rem] border border-white/30 bg-white/15 p-7 text-white shadow-[0_30px_80px_-30px_rgba(60,10,5,0.65)] backdrop-blur-xl sm:p-9">
        <div className="mb-6 flex justify-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <LogoMark mono gid="sf-heat-auth" className="h-12 w-12 text-white" />
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
