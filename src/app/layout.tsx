import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { THEME_SCRIPT } from "@/components/theme";
import { Splash } from "@/components/splash";
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
    { media: "(prefers-color-scheme: light)", color: "#fffdf9" },
    { media: "(prefers-color-scheme: dark)", color: "#15110d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-theme / class before React loads, hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Splash />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
