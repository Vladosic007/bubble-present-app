import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

// ❗ МАГИЯ PWA (Кэширование для работы без инета) ❗
const withPwaConfig = withPWA({
  dest: "public", // Куда сохранять кэш
  cacheOnFrontEndNav: true, 
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Отключаем кэш во время разработки, чтобы ты видел свои изменения сразу
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPwaConfig(nextConfig);