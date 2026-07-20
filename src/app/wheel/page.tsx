"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_SECTORS } from '../../lib/wheelConfig';

type Prize = {
  type: 'promo' | 'coins';
  label: string; emoji: string;
  code?: string; validUntil?: string; discount?: number; category?: string;
  amount?: number;
};

// Формат обратного отсчёта: "2д 5ч" / "5ч 12м" / "12м"
function formatLeft(until: string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return 'истёк';
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}д ${h % 24}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export default function WheelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [spins, setSpins] = useState(0);
  const [balance, setBalance] = useState(0);
  const [spinCost, setSpinCost] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [busy, setBusy] = useState(false);
  const [noProfile, setNoProfile] = useState(false);

  // Свайп вправо → назад к баблику
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null; touchStartY.current = null;
    if (dx > 70 && Math.abs(dx) > Math.abs(dy) && !spinning) router.push('/bubblik');
  };

  const load = () => {
    const phone = localStorage.getItem('bubble_user_phone');
    if (!phone) { setNoProfile(true); setLoading(false); return; }
    fetch(`/api/wheel?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(j => {
        setSpins(j.spins || 0); setBalance(j.balance || 0); setSpinCost(j.spinCost || 50); setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const doSpin = async () => {
    if (spinning || spins < 1) return;
    const phone = localStorage.getItem('bubble_user_phone');
    if (!phone) { alert('Заполни профиль'); router.push('/profile/info'); return; }
    setSpinning(true); setPrize(null); setBusy(true);
    try {
      const res = await fetch('/api/wheel/spin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const j = await res.json();
      if (!j.ok) { setSpinning(false); setBusy(false); alert(j.error === 'no_spins' ? 'Нет прокруток!' : 'Ошибка'); return; }

      // Крутим колесо к нужному сектору
      const secCount = WHEEL_SECTORS.length;
      const secAngle = 360 / secCount;
      const target = j.sectorIndex * secAngle + secAngle / 2;
      // 🎯 Считаем точно: текущий угол по модулю 360 → сколько нужно докрутить,
      // чтобы стрелка встала ровно на середину нужного сектора.
      // Без этого при повторных спинах угол накапливался и колесо промахивалось.
      setRotation(prev => {
        const currentMod = ((prev % 360) + 360) % 360;
        const needAngle = (360 - target) % 360;
        const diff = ((needAngle - currentMod) + 360) % 360;
        // Плюс 5 полных оборотов для красивой анимации
        return prev + 360 * 5 + diff;
      });

      setTimeout(() => {
        setPrize(j.sector);
        setSpins(j.spinsLeft);
        setSpinning(false);
        setBusy(false);
      }, 4200);
    } catch {
      setSpinning(false); setBusy(false);
    }
  };

  const buySpin = async () => {
    const phone = localStorage.getItem('bubble_user_phone');
    if (!phone) return;
    setBusy(true);
    const res = await fetch('/api/wheel/buy-spin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    }).then(r => r.json()).catch(() => null);
    if (res?.ok) { setBalance(res.balance); setSpins(res.spins); }
    else if (res?.error === 'not_enough') alert(`Нужно ${spinCost} коинов`);
    setBusy(false);
  };

  const secAngle = 360 / WHEEL_SECTORS.length;

  return (
    <div className="bg-[#110A1A] min-h-[100dvh] w-full flex justify-center overflow-x-hidden font-sans relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image draggable={false} src="/images/bubblik-bg.jpg" alt="" fill className="object-cover opacity-40" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#110A1A]/40 via-[#110A1A]/70 to-[#110A1A]" />
      </div>

      <main onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="w-full max-w-[400px] relative z-10 flex flex-col items-center px-[20px] pb-[120px] touch-pan-y">
        {/* Шапка */}
        <div className="w-full flex items-center justify-between pt-[40px] mb-[20px]">
          <button onClick={() => router.back()} className="w-[40px] h-[40px] bg-white/10 rounded-full flex items-center justify-center active:scale-95">
            <span className="text-white text-[18px]">←</span>
          </button>
          <span className="text-white font-['Benzin'] font-extrabold text-[14px] uppercase tracking-wider">🎡 Рулетка</span>
          <div className="w-[40px]" />
        </div>

        {/* Спины/баланс */}
        <div className="flex gap-[10px] mb-[24px]">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[14px] px-[14px] py-[8px] flex items-center gap-[6px]">
            <span className="text-[18px]">🎡</span>
            <span className="text-white font-['Benzin'] font-extrabold text-[14px]">{spins}</span>
            <span className="text-white/60 font-['Arial'] font-bold text-[9px] uppercase">спинов</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[14px] px-[14px] py-[8px] flex items-center gap-[6px]">
            <span className="text-[18px]">🪙</span>
            <span className="text-white font-['Benzin'] font-extrabold text-[14px]">{balance}</span>
          </div>
        </div>

        {loading ? (
          <span className="text-[#FF008C] font-['Benzin'] animate-pulse uppercase text-[13px] mt-[40px]">Загрузка...</span>
        ) : noProfile ? (
          <div className="mt-[40px] w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-[24px] text-center flex flex-col gap-[14px]">
            <span className="text-[46px]">🎡</span>
            <span className="text-white font-['Benzin'] font-extrabold text-[14px] uppercase">Сначала войди</span>
            <span className="text-white/70 font-['Arial'] font-bold text-[11px] leading-snug">
              Заполни имя и телефон в профиле — и получишь свою первую прокрутку рулетки 🎁
            </span>
            <button
              onClick={() => router.push('/profile/info')}
              className="h-[48px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95"
            >
              Заполнить профиль
            </button>
          </div>
        ) : (
          <>
            {/* Барабан */}
            <div className="relative w-[300px] h-[300px] mb-[24px]">
              {/* Указатель сверху */}
              <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
              </div>
              {/* Колесо */}
              <motion.div
                animate={{ rotate: rotation }}
                transition={{ duration: 4, ease: [0.15, 0.55, 0.15, 1] }}
                className="relative w-full h-full rounded-full overflow-hidden shadow-[0_0_40px_rgba(255,0,140,0.5)] border-[6px] border-white/20"
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {WHEEL_SECTORS.map((s, i) => {
                    const a0 = (i * secAngle - 90) * Math.PI / 180;
                    const a1 = ((i + 1) * secAngle - 90) * Math.PI / 180;
                    const x0 = 100 + 100 * Math.cos(a0), y0 = 100 + 100 * Math.sin(a0);
                    const x1 = 100 + 100 * Math.cos(a1), y1 = 100 + 100 * Math.sin(a1);
                    const large = secAngle > 180 ? 1 : 0;
                    const path = `M100,100 L${x0},${y0} A100,100 0 ${large},1 ${x1},${y1} Z`;
                    const mid = (i * secAngle + secAngle / 2 - 90) * Math.PI / 180;
                    const tx = 100 + 62 * Math.cos(mid), ty = 100 + 62 * Math.sin(mid);
                    return (
                      <g key={i}>
                        <path d={path} fill={s.color} stroke="#fff" strokeWidth="1" opacity="0.9" />
                        <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                              fill="#fff" fontSize="12" fontWeight="800"
                              transform={`rotate(${i * secAngle + secAngle / 2}, ${tx}, ${ty})`}>
                          {s.emoji}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </motion.div>
              {/* Центр — коин */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] z-10">
                <Image draggable={false} src="/images/bablecoin.png" alt="" fill className="object-contain drop-shadow-[0_0_15px_rgba(255,0,140,0.6)]" />
              </div>
            </div>

            {/* Главная кнопка "Крутить" */}
            <motion.button
              onClick={doSpin}
              disabled={spinning || spins < 1}
              whileTap={{ scale: 0.96 }}
              animate={spins > 0 && !spinning ? { boxShadow: ['0 6px 24px rgba(255,0,140,0.4)', '0 6px 40px rgba(255,0,140,0.8)', '0 6px 24px rgba(255,0,140,0.4)'] } : {}}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-[62px] bg-gradient-to-r from-[#FF00EE] via-[#FF008C] to-[#FFD700] text-white rounded-[20px] font-['Benzin'] font-extrabold text-[16px] uppercase tracking-wider disabled:opacity-40 disabled:from-gray-600 disabled:to-gray-700 flex items-center justify-center gap-[10px] border-2 border-white/30"
            >
              {spinning ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-[22px]">🎡</motion.span> Крутим...</>
              ) : spins < 1 ? 'Нет прокруток 🥲' : (
                <><span className="text-[22px]">🎡</span> Крутить!</>
              )}
            </motion.button>

            {spins < 1 && (
              <button
                onClick={buySpin}
                disabled={busy || balance < spinCost}
                className="w-full h-[44px] mt-[10px] bg-white/10 border border-white/20 text-white rounded-[14px] font-['Benzin'] font-extrabold text-[11px] uppercase active:scale-95 disabled:opacity-40"
              >
                🪙 Купить прокрутку за {spinCost} коинов
              </button>
            )}

            <div className="w-full mt-[24px] bg-white/8 border border-white/12 rounded-[14px] p-[12px] text-center">
              <span className="text-white/70 font-['Arial'] font-bold text-[10px] leading-snug">
                Промокоды на категории · Коины · Джекпот — напиток в подарок!<br/>
                +1 спин за каждый заказ · 3 спина в ДР баблика
              </span>
            </div>

          </>
        )}

        {/* ОКНО ВЫИГРЫША */}
        <AnimatePresence>
          {prize && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-[24px]"
              onClick={() => setPrize(null)}
            >
              <motion.div
                initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[320px] bg-gradient-to-b from-[#2A1535] to-[#160A22] border border-[#FF008C]/40 rounded-[28px] p-[26px] flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,0,140,0.5)]"
              >
                <span className="text-[#FFD700] font-['Benzin'] font-extrabold text-[11px] uppercase tracking-wider">🎉 Выигрыш!</span>
                <span className="text-[56px] mt-[8px]">{prize.emoji}</span>
                <span className="text-white font-['Benzin'] font-extrabold text-[20px] uppercase mt-[8px] leading-tight">{prize.label}</span>

                {prize.type === 'promo' && prize.code && (
                  <>
                    <div className="mt-[16px] bg-white/10 border border-[#FF008C]/40 rounded-[14px] px-[16px] py-[10px]">
                      <span className="text-white font-['Benzin'] font-extrabold text-[16px] tracking-wider">{prize.code}</span>
                    </div>
                    <span className="text-white/70 font-['Arial'] font-bold text-[10px] mt-[10px]">
                      Промокод уже в разделе <span className="text-[#FF008C]">«Мои промокоды»</span> в корзине
                    </span>
                    {prize.validUntil && (
                      <span className="text-[#FFD700] font-['Arial'] font-bold text-[10px] mt-[6px]">
                        ⏳ Сгорит через {formatLeft(prize.validUntil)} ({new Date(prize.validUntil).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </>
                )}
                {prize.type === 'coins' && (
                  <span className="text-[#14FF00] font-['Benzin'] font-extrabold text-[26px] mt-[10px]">+{prize.amount} 🪙</span>
                )}

                <button onClick={() => setPrize(null)} className="w-full h-[46px] mt-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95">
                  Забрать 🎁
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
