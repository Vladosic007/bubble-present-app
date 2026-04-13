import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Отключаем строгие проверки ESLint при деплое
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Отключаем строгие проверки TypeScript при деплое
    ignoreBuildErrors: true,
  },
};

export default nextConfig;