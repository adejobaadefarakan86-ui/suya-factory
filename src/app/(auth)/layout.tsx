// Shared frame for /login and /signup. The (auth) folder name in brackets
// groups these pages without adding "/auth" to the web address.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
