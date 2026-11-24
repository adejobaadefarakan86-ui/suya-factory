import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { THEME_SCRIPT } from "@/components/theme";
import { Splash } from "@/components/splash";
import { ServiceWorker } from "@/components/service-worker";
import { Welcome } from "@/components/welcome";
import { Onboarding } from "@/components/onboarding";
import { TrailRecorder } from "@/components/back-button";
import { Tour } from "@/components/tour";
import { CountryPicker } from "@/components/country-picker";
import { FooterRise } from "@/components/footer-rise";
import { chosenCountry, detectCountry } from "@/lib/country";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

// Headings: Outfit, soft and geometric like the lettering in our logo.
// Text: Inter, clean and easy to read. Both are variable fonts (one file each).
const heading = Outfit({ variable: "--font-heading", subsets: ["latin"], display: "swap" });
const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Suya Factory",
  description: "Spicy beef kilishi, hygienically prepared and delivered across Nigeria and Ghana.",
  applicationName: "Suya Factory",
  // iPhone "Add to Home Screen": opens full screen like an app, named Suya Factory.
  appleWebApp: { capable: true, title: "Suya Factory", statusBarStyle: "default" },
};

// The phone status bar blends with the page (cream in light, warm dark in dark).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-theme / class before React loads, hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Splash />
        <ServiceWorker />
        {/* Knows the current page, so it streams in. */}
        <Suspense fallback={null}><Welcome /></Suspense>
        {/* First open: choose your country (Nigeria or Ghana), once. */}
        <Suspense fallback={null}><CountryGate /></Suspense>
        {/* First-open welcome (log in / create account / guest), after the country. */}
        <Suspense fallback={null}><OnboardingGate /></Suspense>
        {/* Remembers the pages visited, for the in-app back arrow. */}
        <Suspense fallback={null}><TrailRecorder /></Suspense>
        {/* Guided tour of the control room. */}
        <Suspense fallback={null}><Tour /></Suspense>
        <SiteHeader />
        {children}
        {/* Footer on the home page only, rising into place. */}
        <Suspense fallback={null}><FooterRise><SiteFooter /></FooterRise></Suspense>
      </body>
    </html>
  );
}

/** Knows whether someone is logged in, so the welcome screen can stay away for members. */
async function OnboardingGate() {
  return <Onboarding loggedIn={Boolean(await getCurrentUser())} />;
}

/** Shows the country choice until the visitor has made it. */
async function CountryGate() {
  if (await chosenCountry()) return null;
  return <CountryPicker detected={await detectCountry()} />;
}
