import '@/app/globals.css';
import BottomNav from "../components/BottomNav";
import BubblikBackground from "../components/BubblikBackground";
import ZoomBlocker from "../components/ZoomBlocker";
import AttributionTracker from "../components/AttributionTracker";
import PushOptIn from "../components/PushOptIn";
import type { Metadata } from 'next';

// ❗ ЗАПРЕЩАЕМ ЗУМ (ЧТОБЫ ВЫГЛЯДЕЛО КАК НАСТОЯЩЕЕ ПРИЛОЖЕНИЕ) ❗
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Bubble Present — Бабл Ти в Таганроге | Доставка и самовывоз',
  description: 'Bubble Present — лучший бабл ти в Таганроге. Бабл кофе, матча, лимонады с доставкой и самовывозом. Закажи онлайн!',
  keywords: 'бабл ти таганрог, bubble tea таганрог, бабл презент, бабл кофе таганрог, бабл матча таганрог, доставка напитков таганрог, чай с шариками таганрог, тайский чай таганрог, матча таганрог, лимонад таганрог доставка, кофе с собой таганрог, bubble present, buble present',
  openGraph: {
    title: 'Bubble Present — Бабл Ти в Таганроге',
    description: 'Бабл ти, кофе, матча и лимонады с доставкой по Таганрогу. Закажи онлайн на bubblepresent.ru',
    url: 'https://bubblepresent.ru',
    siteName: 'Bubble Present',
    images: [
      {
        url: 'https://bubblepresent.ru/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bubble Present — Бабл Ти в Таганроге',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bubble Present — Бабл Ти в Таганроге',
    description: 'Бабл ти, кофе, матча и лимонады с доставкой по Таганрогу',
    images: ['https://bubblepresent.ru/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://bubblepresent.ru',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* ❗ ПОДКЛЮЧАЕМ PWA (ЯРЛЫК НА РАБОЧИЙ СТОЛ) ❗ */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF008C" />
        <link rel="apple-touch-icon" href="/images/icon-192.png" />
      </head>
      <body className="antialiased text-black" suppressHydrationWarning>

        {/* Глобальная блокировка pinch-zoom и двойного-тапа */}
        <ZoomBlocker />

        {/* Запоминаем источник трафика (откуда пришёл клиент) */}
        <AttributionTracker />

        {/* Регистрация SW + предложение включить push */}
        <PushOptIn />

        {/* Летающий баблик на фоне (виден на ПК по бокам) */}
        <BubblikBackground />

        {/* Само приложение — центрированная колонка поверх фона */}
        <main className="relative z-10 min-h-screen pb-24 max-w-[440px] mx-auto">
          {children}
        </main>

        <BottomNav />
      </body>
    </html>
  );
}