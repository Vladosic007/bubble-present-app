import '@/app/globals.css';
import BottomNav from "../components/BottomNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* ❗ ПОДКЛЮЧАЕМ PWA (ЯРЛЫК НА РАБОЧИЙ СТОЛ) ❗ */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF008C" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased bg-white text-black" suppressHydrationWarning>

        <main className="min-h-screen pb-24">
          {children}
        </main>
        
        <BottomNav />
      </body>
    </html>
  );
}