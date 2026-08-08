import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.XENIOS_STATIC_EXPORT === "1" ? "export" : undefined,
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
