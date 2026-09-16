"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCartStore } from '../store/cartStore';
import {
  isFridayDeliveryPromoActive,
  FRIDAY_PROMO_DISCOUNT,
  FRIDAY_PROMO_END,
  FRIDAY_PROMO_LABEL,
} from '../lib/promoConfig';

// Ключ «попап уже показан» — свой для каждой акции (по дате окончания)
const POPUP_SEEN_KEY = `bubble_seen_promo_${FRIDAY_PROMO_END.getTime()}`;

// Акция ждёт показа попапа? (чтобы попап новостей не вылез поверх)
export function deliveryPromoPopupPending(): boolean {
  if (!isFridayDeliveryPromoActive()) return false;
  try { return !localStorage.getItem(POPUP_SEEN_KEY); } catch { return false; }
}

// Активна ли акция на доставку. Считаем только в браузере (после монтирования),
// и перепроверяем раз в 30 сек — открытая вкладка сама погасит акцию в полночь.
export function useDeliveryPromo(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const check = () => setActive(isFridayDeliveryPromoActive());
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);
  return active;
}

// Обратный отсчёт до конца акции: "07:42:15"
function useCountdown(): string {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, FRIDAY_PROMO_END.getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

// Переключаем корзину на доставку и ведём в меню
function useOrderDelivery() {
  const router = useRouter();
  const { setOrderType } = useCartStore();
  return () => {
    setOrderType('delivery');
    router.push('/menu/tea');
  };
}

// Пузырьки-жемчужины на фоне (декор)
function Pearls() {
  return (
    <>
      <span className="absolute -top-[30px] -right-[20px] w-[120px] h-[120px] rounded-full bg-white/10" />
      <span className="absolute top-[70px] right-[70px] w-[26px] h-[26px] rounded-full bg-white/15" />
      <span className="absolute -bottom-[40px] -left-[30px] w-[110px] h-[110px] rounded-full bg-[#110A1A]/10" />
      <span className="absolute bottom-[80px] right-[24px] w-[14px] h-[14px] rounded-full bg-white/20" />
    </>
  );
}

// === БАННЕР НА ГЛАВНОЙ ===
export function DeliveryPromoBanner() {
  const active = useDeliveryPromo();
  const timeLeft = useCountdown();
  const orderDelivery = useOrderDelivery();

  if (!active) return null;

  return (
    <div
      className="relative w-full max-w-[370px] mb-[20px] rounded-[28px] overflow-hidden p-[20px] shadow-[0_10px_28px_rgba(255,0,140,0.35)]"
      style={{ background: 'linear-gradient(135deg,#FF00EE 0%,#FF008C 55%,#FF4D6D 100%)' }}
    >
      <Pearls />

      <div className="relative flex items-start justify-between">
        <span className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-[10px] py-[5px] font-['Benzin'] font-extrabold text-[9px] text-white uppercase tracking-wider">
          🔥 {FRIDAY_PROMO_LABEL}
        </span>
        <span className="text-[44px] leading-none animate-bounce drop-shadow-lg">🛵</span>
      </div>

      <div className="relative -mt-[6px]">
        <div className="font-['Benzin'] font-extrabold text-[64px] leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
          -{FRIDAY_PROMO_DISCOUNT}%
        </div>
        <div className="font-['Benzin'] font-extrabold text-[18px] text-white uppercase leading-tight mt-[2px]">
          на доставку
        </div>
        <div className="font-['Arial'] font-bold text-[11px] text-white/85 mt-[4px]">
          Все напитки с доставкой — в два раза дешевле
        </div>
      </div>

      <div className="relative flex items-center justify-between mt-[14px]">
        <span className="font-['Arial'] font-bold text-[10px] text-white/80 uppercase">До конца акции</span>
        <span className="bg-[#110A1A]/35 rounded-[10px] px-[10px] py-[4px] font-['Benzin'] font-extrabold text-[15px] text-white tabular-nums">
          {timeLeft}
        </span>
      </div>

      <button
        onClick={orderDelivery}
        className="relative w-full h-[48px] mt-[14px] bg-white rounded-[16px] active:scale-95 transition-transform shadow-[0_4px_14px_rgba(17,10,26,0.2)]"
      >
        <span className="font-['Benzin'] font-extrabold text-[12px] uppercase bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent">
          Заказать доставку
        </span>
      </button>
    </div>
  );
}

// === ПОПАП (1 раз за акцию) ===
export function DeliveryPromoPopup() {
  const pathname = usePathname();
  const timeLeft = useCountdown();
  const orderDelivery = useOrderDelivery();
  const [open, setOpen] = useState(false);

  // В админке и корзине не мешаем
  const hiddenHere = pathname?.startsWith('/admin') || pathname?.startsWith('/cart');

  useEffect(() => {
    if (hiddenHere) return;
    const t = setTimeout(() => {
      if (deliveryPromoPopupPending()) setOpen(true);
    }, 1200); // не сразу — дать странице прогрузиться
    return () => clearTimeout(t);
  }, [hiddenHere]);

  const close = () => {
    try { localStorage.setItem(POPUP_SEEN_KEY, '1'); } catch {}
    setOpen(false);
  };

  const go = () => {
    close();
    orderDelivery();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-[24px]" onClick={close}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[330px] bg-[#160A22] border border-[#FF008C]/40 rounded-[28px] overflow-hidden shadow-[0_0_50px_rgba(255,0,140,0.5)] animate-in zoom-in-95 duration-200"
      >
        {/* Верх — градиент с большой скидкой */}
        <div
          className="relative w-full h-[170px] overflow-hidden flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#FF00EE 0%,#FF008C 55%,#FF4D6D 100%)' }}
        >
          <Pearls />
          <button onClick={close} aria-label="Закрыть" className="absolute top-[10px] right-[10px] w-[30px] h-[30px] rounded-full bg-black/25 backdrop-blur-md text-white flex items-center justify-center text-[16px] z-10">✕</button>
          <span className="relative text-[40px] leading-none animate-bounce">🛵</span>
          <span className="relative font-['Benzin'] font-extrabold text-[60px] leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            -{FRIDAY_PROMO_DISCOUNT}%
          </span>
        </div>

        {/* Текст */}
        <div className="p-[20px] flex flex-col items-center text-center">
          <span className="bg-[#FF008C]/15 text-[#FF4DB8] rounded-full px-[10px] py-[4px] font-['Benzin'] font-extrabold text-[9px] uppercase tracking-wider">
            {FRIDAY_PROMO_LABEL}
          </span>
          <span className="font-['Benzin'] font-extrabold text-[17px] text-white uppercase leading-tight mt-[10px]">
            Доставка за полцены
          </span>
          <span className="font-['Arial'] font-bold text-[12px] text-white/70 mt-[8px] leading-relaxed">
            Все напитки с доставкой в два раза дешевле. Успей до полуночи!
          </span>

          <div className="flex items-center gap-[8px] mt-[14px]">
            <span className="font-['Arial'] font-bold text-[10px] text-white/50 uppercase">Осталось</span>
            <span className="bg-white/10 rounded-[10px] px-[10px] py-[4px] font-['Benzin'] font-extrabold text-[16px] text-white tabular-nums">
              {timeLeft}
            </span>
          </div>

          <button onClick={go} className="w-full h-[48px] mt-[16px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95">
            Заказать доставку
          </button>
          <button onClick={close} className="mt-[10px] font-['Arial'] font-bold text-[11px] text-white/40 uppercase">
            Позже
          </button>
          <span className="font-['Arial'] text-[9px] text-white/30 mt-[10px]">
            Не суммируется с промокодами и коинами
          </span>
        </div>
      </div>
    </div>
  );
}
