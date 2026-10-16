import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server (HMR, dev assets) be opened from this machine's LAN address, e.g. to test on a phone.
  // Add the new address here if the network IP changes.
  allowedDevOrigins: ["10.10.6.56"],
  cacheComponents: true,
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
