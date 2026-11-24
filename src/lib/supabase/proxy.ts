// Keeps the user's login session fresh on every request.
// Called from src/proxy.ts (Next.js 16 renamed "middleware" to "proxy").
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Stop CDNs caching one user's login cookie and serving it to others.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Don't put code between createServerClient and this call.
  // It checks the login token and refreshes it if it has expired.
  const { data } = await supabase.auth.getClaims();

  // Quick first check: not logged in at all? Send to login before loading
  // the page. (Pages still do the full role check themselves.)
  const path = request.nextUrl.pathname;
  if (!data?.claims && (path.startsWith("/admin") || path.startsWith("/account") || path === "/stock")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(path)}`;
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // Team accounts open the app on the control room. They can still look at the
  // shop: "Customer view" sets the sf_view cookie for the rest of the visit.
  if (data?.claims && path === "/" && request.cookies.get("sf_view")?.value !== "shop") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.claims.sub).single();
    if (profile?.role === "staff" || profile?.role === "admin") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      const redirect = NextResponse.redirect(adminUrl);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return response;
}
