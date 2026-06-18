'use client';
import { useEffect } from 'react';

// Глобальная блокировка zoom-жестов (особенно для iOS Safari, где viewport-теги
// иногда игнорируются). Не мешает обычному скроллу и тапам.
export default function ZoomBlocker() {
  useEffect(() => {
    // Pinch-zoom (двумя пальцами)
    const onGesture = (e: Event) => e.preventDefault();
    // Двойной тап — на iOS приближает экран
    let lastTouchEnd = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 350) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    // Ctrl + колесо мыши (десктоп) и Ctrl + клавиши -/= (тоже зум)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['=', '-', '+', '0'].includes(e.key)) {
        e.preventDefault();
      }
    };

    document.addEventListener('gesturestart', onGesture as any);
    document.addEventListener('gesturechange', onGesture as any);
    document.addEventListener('gestureend', onGesture as any);
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('gesturestart', onGesture as any);
      document.removeEventListener('gesturechange', onGesture as any);
      document.removeEventListener('gestureend', onGesture as any);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
