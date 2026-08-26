import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep file tracing inside this app when nested lockfiles exist nearby.
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.alicdn.com" },
      { protocol: "https", hostname: "**.1688.com" },
      { protocol: "https", hostname: "**.taobao.com" },
      { protocol: "https", hostname: "**.tbcdn.cn" },
      { protocol: "https", hostname: "**.geilicdn.com" },
      { protocol: "https", hostname: "**.vdstatic.com" },
      { protocol: "https", hostname: "**.hiobuy.com" },
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
