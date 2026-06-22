"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type Tx = { amount: number; type: string; note: string; order_id: number | null; created_at: string };

const TYPE_LABEL: Record<string, string> = {
  order_earn: '🛍 За заказ',
  order_redeem: '💸 Списано',
  welcome: '🎁 Приветственный бонус',
  levelup: '✨ Новый уровень',
  birthday: '🎂 День рождения',
  referral: '🤝 Реферальный бонус',
  admin: '⚙️ Начисление',
};

export default function CoinsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasPhone, setHasPhone] = useState(true);
  const [balance, setBalance] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelDiscount, setLevelDiscount] = useState(0);
  const [history, setHistory] = useState<Tx[]>([]);
  const [refCode, setRefCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const phone = localStorage.getItem('bubble_user_phone');
    if (!phone) { setHasPhone(false); setLoading(false); return; }
    fetch(`/api/coins?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(json => {
        setBalance(json.balance || 0);
        setLevel(json.level || 1);
        setLevelDiscount(json.levelDiscount || 0);
        setHistory(json.history || []);
        setRefCode(json.refCode || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const refLink = refCode && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${refCode}` : '';

  const handleShare = async () => {
    if (!refLink) return;
    const text = `Привет! Лови баблкоины в Bubble Present 🧋 Закажи по моей ссылке — оба получим бонус: ${refLink}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bubble Present', text });
      } else {
        await navigator.clipboard.writeText(refLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  return (
    <div className="bg-[#110A1A] min-h-[100dvh] w-full flex justify-center overflow-x-hidden font-sans relative">
      {/* Космический фон */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image draggable={false} src="/images/bubblik-bg.jpg" alt="" fill className="object-cover opacity-50" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#110A1A]/40 via-[#110A1A]/70 to-[#110A1A]" />
      </div>

      <main className="w-full max-w-[400px] relative z-10 flex flex-col items-center px-[20px] pb-[120px]">
        {/* Шапка */}
        <div className="w-full flex items-center justify-between pt-[40px] mb-[10px]">
          <button onClick={() => router.back()} className="w-[40px] h-[40px] bg-white/10 rounded-full flex items-center justify-center active:scale-95 backdrop-blur-md">
            <span className="text-white text-[18px]">←</span>
          </button>
          <span className="text-white font-['Benzin'] font-extrabold text-[14px] uppercase tracking-wider">Баблкоины</span>
          <div className="w-[40px]" />
        </div>

        {loading ? (
          <div className="mt-[120px]"><span className="text-[#FF008C] font-['Benzin'] animate-pulse uppercase text-[13px]">Загрузка...</span></div>
        ) : !hasPhone ? (
          <div className="mt-[80px] w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-[24px] text-center flex flex-col gap-[14px]">
            <span className="text-[40px]">🔒</span>
            <span className="text-white font-['Benzin'] font-extrabold text-[14px] uppercase">Сначала войди</span>
            <span className="text-white/70 font-['Arial'] font-bold text-[11px]">Заполни профиль (имя и телефон) — и мы начнём копить твои баблкоины. Новичку сразу подарок 🎁</span>
            <button onClick={() => router.push('/profile/info')} className="h-[46px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95">Заполнить профиль</button>
          </div>
        ) : (
          <>
            {/* Главный баланс */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="mt-[20px] flex flex-col items-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-[120px] h-[120px] drop-shadow-[0_0_30px_rgba(255,0,140,0.5)]"
              >
                <Image draggable={false} src="/images/bablecoin.png" alt="Баблкоин" fill className="object-contain" priority />
              </motion.div>
              <span className="mt-[10px] text-white font-['Benzin'] font-extrabold text-[44px] leading-none">{balance}</span>
              <span className="text-[#FF008C] font-['Benzin'] font-extrabold text-[14px] uppercase mt-[4px]">≈ {balance} ₽ скидка</span>
            </motion.div>

            {/* CTA */}
            <button
              onClick={() => router.push('/')}
              className="w-full h-[52px] mt-[24px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[16px] font-['Benzin'] font-extrabold text-[13px] uppercase active:scale-95 transition-transform shadow-[0_6px_20px_rgba(255,0,140,0.4)]"
            >
              Потратить в заказе →
            </button>

            {/* Пригласи друга */}
            <div className="w-full mt-[24px] bg-gradient-to-br from-[#FF00EE]/20 to-[#FF008C]/10 border border-[#FF008C]/30 rounded-[18px] p-[16px] flex flex-col gap-[10px]">
              <span className="text-white font-['Benzin'] font-extrabold text-[12px] uppercase">🤝 Пригласи друга</span>
              <span className="text-white/70 font-['Arial'] font-bold text-[10px] leading-snug">
                Друг закажет по твоей ссылке — <span className="text-[#14FF00]">+50 коинов тебе</span> и <span className="text-[#14FF00]">+50 ему</span>!
              </span>
              <button
                onClick={handleShare}
                disabled={!refLink}
                className="w-full h-[46px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95 transition-transform disabled:opacity-40"
              >
                {copied ? '✅ Ссылка скопирована!' : '📤 Поделиться ссылкой'}
              </button>
            </div>

            {/* Как заработать */}
            <div className="w-full mt-[24px] flex flex-col gap-[10px]">
              <span className="text-white/80 font-['Benzin'] font-extrabold text-[11px] uppercase tracking-wider px-[4px]">💎 Как заработать</span>
              <EarnCard icon="🛍" title="Каждый заказ" desc="10 ₽ в заказе = 1 баблкоин" />
              <EarnCard icon="✨" title="Новый уровень баблика" desc="Случайно +1–100 коинов за каждый уровень" />
              <EarnCard icon="🎁" title="Приветственный бонус" desc="50 коинов новичку за первый вход" />
              {/* Тизер заданий */}
              <div className="w-full bg-white/5 border border-dashed border-white/20 rounded-[16px] p-[14px] flex items-center gap-[12px] opacity-80">
                <span className="text-[22px]">🔒</span>
                <div className="flex flex-col">
                  <span className="text-white font-['Benzin'] font-extrabold text-[11px] uppercase">Скоро: задания</span>
                  <span className="text-white/50 font-['Arial'] font-bold text-[10px]">Выполняй задания и получай коины — уже готовим!</span>
                </div>
              </div>
            </div>

            {/* Как потратить */}
            <div className="w-full mt-[20px] bg-white/10 backdrop-blur-xl border border-white/15 rounded-[16px] p-[14px] flex flex-col gap-[6px]">
              <span className="text-white/80 font-['Benzin'] font-extrabold text-[11px] uppercase tracking-wider">💸 Как потратить</span>
              <span className="text-white/70 font-['Arial'] font-bold text-[11px]">1 коин = 1 ₽ скидки в корзине. Коинами можно оплатить до 50% заказа.</span>
            </div>

            {/* История */}
            <div className="w-full mt-[20px] flex flex-col gap-[8px]">
              <span className="text-white/80 font-['Benzin'] font-extrabold text-[11px] uppercase tracking-wider px-[4px]">📜 История</span>
              {history.length === 0 ? (
                <span className="text-white/40 font-['Arial'] font-bold text-[11px] px-[4px]">Пока пусто — сделай первый заказ 🧋</span>
              ) : (
                history.map((t, i) => (
                  <div key={i} className="w-full bg-white/8 backdrop-blur-md rounded-[12px] px-[14px] py-[10px] flex items-center justify-between border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-white font-['Arial'] font-bold text-[11px]">{TYPE_LABEL[t.type] || t.type}</span>
                      <span className="text-white/40 font-['Arial'] font-bold text-[9px]">{new Date(t.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className={`font-['Benzin'] font-extrabold text-[14px] ${t.amount >= 0 ? 'text-[#14FF00]' : 'text-[#FF6B6B]'}`}>
                      {t.amount >= 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function EarnCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-[16px] p-[14px] flex items-center gap-[12px]">
      <span className="text-[22px]">{icon}</span>
      <div className="flex flex-col">
        <span className="text-white font-['Benzin'] font-extrabold text-[11px] uppercase">{title}</span>
        <span className="text-white/60 font-['Arial'] font-bold text-[10px]">{desc}</span>
      </div>
    </div>
  );
}
