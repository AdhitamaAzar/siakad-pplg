import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Semua halaman menggunakan data real-time (auth + database),
  // jadi tidak boleh di-prerender saat build.
  experimental: {
    ppr: false,
  },
};

export default nextConfig;
