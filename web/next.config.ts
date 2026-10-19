import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server (HMR, dev assets) be opened from this machine's LAN address, e.g. to test on a phone.
  // Add the new address here if the network IP changes.
  allowedDevOrigins: ["10.10.6.56"],
  cacheComponents: true,
  // Photography is exported at quality 90 (scripts/export-assets.mjs, scripts/build-altier.mjs); keep it that way.
  images: { qualities: [75, 90], formats: ["image/webp"] },
  // The site is now AQUILO Altier only; the earlier sub-site paths land on the home page.
  async redirects() {
    return ["/sanitaryware", "/exclusive", "/altier"].flatMap((p) => [
      { source: p, destination: "/", permanent: false },
      { source: `${p}/:path*`, destination: "/", permanent: false },
    ]);
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
