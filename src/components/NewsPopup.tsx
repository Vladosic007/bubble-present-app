"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deliveryPromoPopupPending } from './DeliveryPromo';

type NewsItem = {
  id: number; title: string; text: string; image: string; gradient: string; link: string; is_popup?: boolean;
};

const SEEN_KEY = 'bubble_seen_news';

export default function NewsPopup() {
  const router = useRouter();
  const [item, setItem] = useState<NewsItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      // Сейчас показывается попап акции — новость покажем в следующий заход
      if (deliveryPromoPopupPending()) return;
      fetch('/api/news')
        .then(r => r.json())
        .then(j => {
          const list: NewsItem[] = j.news || [];
          let seen: number[] = [];
          try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch {}
          // первая popup-новость, которую ещё не показывали
          const fresh = list.find(n => n.is_popup && !seen.includes(n.id));
          if (fresh) setItem(fresh);
        })
        .catch(() => {});
    }, 1200); // не сразу — дать странице прогрузиться
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    if (item) {
      try {
        const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        if (!seen.includes(item.id)) { seen.push(item.id); localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); }
      } catch {}
    }
    setItem(null);
  };

  const go = () => {
    const link = item?.link;
    close();
    if (link) {
      if (link.startsWith('http')) window.open(link, '_blank');
      else router.push(link);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-[24px]" onClick={close}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[330px] bg-[#160A22] border border-[#FF008C]/40 rounded-[28px] overflow-hidden shadow-[0_0_50px_rgba(255,0,140,0.5)] animate-in zoom-in-95 duration-200"
      >
        {/* Верх — картинка или градиент */}
        <div className="relative w-full h-[170px]" style={{ background: item.image ? undefined : (item.gradient || 'linear-gradient(120deg,#FF00EE,#FF008C)') }}>
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <button onClick={close} className="absolute top-[10px] right-[10px] w-[30px] h-[30px] rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center text-[16px]">✕</button>
        </div>
        {/* Текст */}
        <div className="p-[20px] flex flex-col items-center text-center">
          <span className="font-['Benzin'] font-extrabold text-[17px] text-white uppercase leading-tight">{item.title}</span>
          {item.text && <span className="font-['Arial'] font-bold text-[12px] text-white/70 mt-[8px] leading-relaxed">{item.text}</span>}
          <button onClick={go} className="w-full h-[48px] mt-[18px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95">
            {item.link ? 'Смотреть' : 'Понятно'}
          </button>
        </div>
      </div>
    </div>
  );
}
