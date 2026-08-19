"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type NewsItem = {
  id: number;
  title: string;
  text: string;
  image: string;
  gradient: string;
  link: string;
};

export default function NewsCarousel() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(j => setNews(j.news || []))
      .catch(() => {});
  }, []);

  // Автопрокрутка каждые 5 сек
  useEffect(() => {
    if (news.length <= 1) return;
    const t = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const next = (active + 1) % news.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(t);
  }, [news, active]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== active) setActive(idx);
  };

  const openNews = (n: NewsItem) => {
    if (!n.link) return;
    if (n.link.startsWith('http')) window.open(n.link, '_blank');
    else router.push(n.link);
  };

  if (news.length === 0) return null;

  return (
    <div className="w-full max-w-[370px] mb-[20px]">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory rounded-[24px]"
        style={{ scrollbarWidth: 'none' }}
      >
        {news.map((n) => (
          <button
            key={n.id}
            onClick={() => openNews(n)}
            className="relative shrink-0 w-full snap-center h-[150px] rounded-[24px] overflow-hidden active:scale-[0.98] transition-transform text-left"
            style={{
              background: n.image
                ? undefined
                : (n.gradient || 'linear-gradient(120deg,#FF00EE,#FF008C)'),
            }}
          >
            {n.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.image} alt={n.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {/* затемнение снизу для читаемости текста */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-[16px]">
              <div className="font-['Benzin'] font-extrabold text-[16px] text-white uppercase leading-tight drop-shadow-md">{n.title}</div>
              {n.text && <div className="font-['Arial'] font-bold text-[11px] text-white/90 mt-[4px] leading-snug drop-shadow line-clamp-2">{n.text}</div>}
            </div>
          </button>
        ))}
      </div>

      {/* Точки-индикаторы */}
      {news.length > 1 && (
        <div className="flex justify-center gap-[6px] mt-[10px]">
          {news.map((_, i) => (
            <span
              key={i}
              className={`h-[6px] rounded-full transition-all duration-300 ${i === active ? 'w-[18px] bg-[#FF008C]' : 'w-[6px] bg-[#D1D1D6]'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
