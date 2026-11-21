import type { MetadataRoute } from "next";

// Lets phones add Suya Factory to the home screen as an app: our grill icon,
// and it opens full screen (no browser bar), starting with the orange opening screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suya Factory",
    short_name: "Suya Factory",
    description: "Spicy beef kilishi. No rules, just bite.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#e4570f",
    theme_color: "#fffdf9",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
