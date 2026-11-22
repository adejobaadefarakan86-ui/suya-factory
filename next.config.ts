import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Let phones on the same Wi-Fi open the dev server (npm run dev:phone, then http://<PC address>:3000).
  // Also a temporary Cloudflare link (cloudflared tunnel) so testers elsewhere can try the dev app.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*", "*.trycloudflare.com"],
  experimental: {
    // Always build styles fresh. Turbopack's saved cache sometimes reused an old
    // stylesheet after globals.css changed (seen locally and on Vercel), so a
    // publish showed new pages with old styles. Slightly slower builds, always correct.
    turbopackFileSystemCacheForBuild: false,
    turbopackFileSystemCacheForDev: false,
    // Forms (server actions) through the temporary Cloudflare link, in development only.
    ...(process.env.NODE_ENV === "development"
      ? { serverActions: { allowedOrigins: ["*.trycloudflare.com"] } }
      : {}),
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
