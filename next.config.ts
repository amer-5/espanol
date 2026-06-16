import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving lesson images from public/illustrations
  images: {
    unoptimized: true,
  },
  // Disable static export — we need server-side for lesson file reads
  // output: "standalone", // uncomment for Docker deploy
};

export default nextConfig;
