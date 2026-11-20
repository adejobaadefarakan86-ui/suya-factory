import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Let phones on the same Wi-Fi open the dev server (npm run dev:phone, then http://<PC address>:3000).
  // Also a temporary Cloudflare link (cloudflared tunnel) so testers elsewhere can try the dev app.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*", "*.trycloudflare.com"],
  // Forms (server actions) through that temporary link, in development only.
  ...(process.env.NODE_ENV === "development"
    ? { experimental: { serverActions: { allowedOrigins: ["*.trycloudflare.com"] } } }
    : {}),
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
