"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

type News = {
  id: number; title: string; text: string; image: string; gradient: string;
  link: string; is_active: boolean; is_popup: boolean; sort: number;
};

const GRADIENTS = [
  'linear-gradient(120deg,#FF00EE,#FF008C)',
  'linear-gradient(120deg,#0A0014,#3A0CA3,#F72585)',
  'linear-gradient(120deg,#2A0845,#6441A5,#FF7E5F)',
  'linear-gradient(120deg,#001F3F,#0074D9,#7FDBFF)',
  'linear-gradient(120deg,#11998e,#38ef7d)',
];

export default function AdminNewsPage() {
  const [bossKey, setBossKey] = useState<string | null>(null);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // форма создания
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [link, setLink] = useState('');
  const [isPopup, setIsPopup] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bubble_boss_pin');
    if (!saved) { setError('Только для босса'); setLoading(false); return; }
    setBossKey(saved);
  }, []);

  const load = (key: string) => {
    fetch('/api/admin/news', { headers: { 'x-boss-key': key } })
      .then(async r => {
        if (!r.ok) { setError('Нет доступа'); setLoading(false); return; }
        const j = await r.json();
        setNews(j.news || []);
        setLoading(false);
      })
      .catch(() => { setError('Ошибка'); setLoading(false); });
  };
  useEffect(() => { if (bossKey) load(bossKey); }, [bossKey]);

  const create = async () => {
    if (!bossKey || !title.trim()) return;
    setBusy(true);
    const res = await fetch('/api/admin/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-boss-key': bossKey },
      body: JSON.stringify({ title, text, image, gradient: image ? '' : gradient, link, is_popup: isPopup, is_active: true, sort: 0 }),
    }).then(r => r.json()).catch(() => null);
    if (res?.ok) {
      setTitle(''); setText(''); setImage(''); setLink(''); setIsPopup(false);
      load(bossKey);
    } else alert('Не удалось создать');
    setBusy(false);
  };

  const patch = async (id: number, p: Partial<News>) => {
    if (!bossKey) return;
    await fetch('/api/admin/news', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-boss-key': bossKey },
      body: JSON.stringify({ id, ...p }),
    }).catch(() => {});
    setNews(prev => prev.map(n => n.id === id ? { ...n, ...p } as News : n));
  };

  const remove = async (id: number) => {
    if (!bossKey || !confirm('Удалить новость?')) return;
    await fetch('/api/admin/news', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-boss-key': bossKey },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    setNews(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="w-full min-h-screen bg-[#110A1A] flex justify-center">
      <div className="w-full max-w-[428px] min-h-screen bg-[#F2F2F7] flex flex-col">
        <header className="w-full bg-[#110A1A] p-[24px] pt-[40px] flex items-center justify-between shrink-0">
          <Link href="/admin" className="w-[40px] h-[40px] bg-white/10 rounded-full flex items-center justify-center active:scale-95"><span className="text-white text-[18px]">←</span></Link>
          <span className="text-white font-['Benzin'] font-extrabold text-[15px] uppercase">📰 Новости</span>
          <div className="w-[40px]" />
        </header>

        <div className="flex-1 w-full overflow-y-auto no-scrollbar p-[20px] flex flex-col gap-[16px]">
          {loading ? (
            <span className="text-[#FF008C] font-['Benzin'] animate-pulse text-center mt-[20px]">Загрузка...</span>
          ) : error ? (
            <div className="bg-[#FFE5E5] border border-[#FF0040] rounded-[16px] p-[20px] text-center font-['Arial'] font-bold text-[12px] text-[#FF0040] uppercase">{error}</div>
          ) : (
            <>
              {/* Форма создания */}
              <div className="bg-white p-[16px] rounded-[20px] border border-[#E5E5EA] flex flex-col gap-[10px]">
                <h2 className="font-['Benzin'] font-extrabold text-[12px] uppercase text-[#FF008C]">Новая новость</h2>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок" maxLength={120} className="w-full h-[40px] bg-[#F2F2F7] rounded-[10px] px-3 font-bold text-[12px] outline-none" />
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Текст (необязательно)" maxLength={500} rows={2} className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 font-bold text-[12px] outline-none resize-none" />
                <input value={image} onChange={e => setImage(e.target.value)} placeholder="Картинка: /images/news/foo.jpg (или пусто)" className="w-full h-[40px] bg-[#F2F2F7] rounded-[10px] px-3 font-bold text-[11px] outline-none" />
                {!image && (
                  <div className="flex gap-[6px]">
                    {GRADIENTS.map(g => (
                      <button key={g} onClick={() => setGradient(g)} className={`w-[36px] h-[28px] rounded-[8px] border-2 ${gradient === g ? 'border-[#FF008C]' : 'border-transparent'}`} style={{ background: g }} />
                    ))}
                  </div>
                )}
                <input value={link} onChange={e => setLink(e.target.value)} placeholder="Ссылка: /wheel, /menu/tea (или пусто)" className="w-full h-[40px] bg-[#F2F2F7] rounded-[10px] px-3 font-bold text-[11px] outline-none" />
                <label className="flex items-center gap-[8px] text-[11px] font-bold text-[#333] uppercase">
                  <input type="checkbox" checked={isPopup} onChange={e => setIsPopup(e.target.checked)} className="w-[18px] h-[18px] accent-[#FF008C]" />
                  Показывать всплывающим окном
                </label>
                <button onClick={create} disabled={busy || !title.trim()} className="w-full h-[40px] bg-[#333] text-white rounded-[10px] font-bold text-[10px] uppercase active:scale-95 disabled:opacity-40">Создать</button>
              </div>

              {/* Список */}
              {news.map(n => (
                <div key={n.id} className={`bg-white rounded-[18px] border overflow-hidden ${n.is_active ? 'border-[#E5E5EA]' : 'border-[#FF0040] opacity-60'}`}>
                  <div className="relative h-[80px]" style={{ background: n.image ? undefined : (n.gradient || GRADIENTS[0]) }}>
                    {n.image && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={n.image} alt="" className="absolute inset-0 w-full h-full object-cover" />)}
                    <div className="absolute inset-0 bg-black/30 flex items-end p-[10px]">
                      <span className="text-white font-['Benzin'] font-extrabold text-[13px] uppercase drop-shadow">{n.title}</span>
                    </div>
                    {n.is_popup && <span className="absolute top-[8px] right-[8px] bg-[#FF008C] text-white text-[8px] font-bold px-[6px] py-[2px] rounded-full uppercase">Попап</span>}
                  </div>
                  <div className="p-[10px] flex items-center gap-[8px]">
                    <button onClick={() => patch(n.id, { is_active: !n.is_active })} className={`flex-1 h-[32px] rounded-[8px] font-bold text-[9px] uppercase ${n.is_active ? 'bg-[#14FF00]/15 text-[#0DAA00]' : 'bg-[#F2F2F7] text-[#949494]'}`}>{n.is_active ? 'Активна' : 'Выключена'}</button>
                    <button onClick={() => patch(n.id, { is_popup: !n.is_popup })} className={`flex-1 h-[32px] rounded-[8px] font-bold text-[9px] uppercase ${n.is_popup ? 'bg-[#FF008C]/15 text-[#FF008C]' : 'bg-[#F2F2F7] text-[#949494]'}`}>Попап</button>
                    <button onClick={() => remove(n.id)} className="w-[40px] h-[32px] rounded-[8px] bg-[#FFE5E5] text-[#FF0040] font-bold text-[12px] active:scale-90">🗑</button>
                  </div>
                </div>
              ))}
              {news.length === 0 && <span className="text-center text-[#949494] font-bold text-[12px] uppercase mt-[10px]">Новостей пока нет</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
