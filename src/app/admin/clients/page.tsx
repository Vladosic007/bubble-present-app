"use client";
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type Client = {
  phone: string;
  name: string;
  address: string;
  orders_count: number;
  total_spent: number;
  avg_check: number;
  first_order: string;
  last_order: string;
  delivery_count: number;
  pickup_count: number;
  favorite_drink: string;
  favorite_count: number;
};

export default function ClientsPage() {
  const [bossKey, setBossKey] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<{ total_clients: number; total_revenue: number; total_orders: number } | null>(null);
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('bubble_boss_pin');
    if (!saved) {
      setError('Доступ только для босса. Войди под PIN босса в админке.');
      setLoading(false);
      return;
    }
    setBossKey(saved);
  }, []);

  useEffect(() => {
    if (!bossKey) return;
    setLoading(true);
    fetch(`/api/admin/clients?period=${period}`, { headers: { 'x-boss-key': bossKey } })
      .then(async r => {
        if (!r.ok) {
          setError('Не удалось загрузить (PIN босса неверный?)');
          setLoading(false);
          return;
        }
        const json = await r.json();
        setClients(json.clients || []);
        setStats(json.stats || null);
        setLoading(false);
      })
      .catch(() => { setError('Ошибка соединения'); setLoading(false); });
  }, [bossKey, period]);

  // Фильтр по поиску
  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase().replace(/\D/g, '');
    const qText = search.toLowerCase();
    return clients.filter(c => {
      const phoneDigits = c.phone.replace(/\D/g, '');
      if (q && phoneDigits.includes(q)) return true;
      if (c.name.toLowerCase().includes(qText)) return true;
      return false;
    });
  }, [clients, search]);

  const handleExport = () => {
    if (!bossKey) return;
    window.open(`/api/admin/clients/export?period=${period}&key=${encodeURIComponent(bossKey)}`, '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-[#110A1A] flex justify-center">
      <div className="w-full max-w-[428px] min-h-screen bg-[#F2F2F7] flex flex-col">
        {/* Шапка */}
        <header className="w-full bg-[#110A1A] p-[24px] pt-[40px] flex flex-col gap-[16px] shrink-0">
          <div className="flex justify-between items-center">
            <Link href="/admin" className="w-[40px] h-[40px] bg-white/10 rounded-full flex items-center justify-center active:scale-95">
              <span className="text-white text-[18px]">←</span>
            </Link>
            <div className="flex flex-col items-center">
              <span className="text-[#FF008C] font-['Benzin'] font-extrabold text-[10px] uppercase tracking-wider">База клиентов</span>
              <span className="text-white font-['Benzin'] font-extrabold text-[16px] uppercase">CRM</span>
            </div>
            <button onClick={handleExport} disabled={!bossKey || clients.length === 0} className="w-[40px] h-[40px] bg-[#14FF00]/20 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-30">
              <span className="text-[16px]">📥</span>
            </button>
          </div>

          {/* Период */}
          <div className="w-full h-[40px] bg-white/10 rounded-[12px] p-[3px] flex relative">
            <div
              className="absolute top-[3px] bottom-[3px] w-[calc(33.33%-2px)] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-[10px] transition-all duration-300 ease-out"
              style={{ left: period === 'week' ? '3px' : period === 'month' ? 'calc(33.33% + 1px)' : 'calc(66.66% - 1px)' }}
            />
            <button onClick={() => setPeriod('week')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[10px] uppercase ${period === 'week' ? 'text-white' : 'text-white/50'}`}>Неделя</button>
            <button onClick={() => setPeriod('month')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[10px] uppercase ${period === 'month' ? 'text-white' : 'text-white/50'}`}>Месяц</button>
            <button onClick={() => setPeriod('all')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[10px] uppercase ${period === 'all' ? 'text-white' : 'text-white/50'}`}>Всё время</button>
          </div>

          {/* Статистика */}
          {stats && (
            <div className="grid grid-cols-3 gap-[8px]">
              <div className="bg-white/10 rounded-[12px] p-[10px] flex flex-col items-center">
                <span className="text-white font-['Benzin'] font-extrabold text-[16px]">{stats.total_clients}</span>
                <span className="text-white/60 font-['Arial'] font-bold text-[8px] uppercase">клиентов</span>
              </div>
              <div className="bg-white/10 rounded-[12px] p-[10px] flex flex-col items-center">
                <span className="text-white font-['Benzin'] font-extrabold text-[16px]">{stats.total_orders}</span>
                <span className="text-white/60 font-['Arial'] font-bold text-[8px] uppercase">заказов</span>
              </div>
              <div className="bg-white/10 rounded-[12px] p-[10px] flex flex-col items-center">
                <span className="text-[#14FF00] font-['Benzin'] font-extrabold text-[14px]">{stats.total_revenue.toLocaleString('ru-RU')}₽</span>
                <span className="text-white/60 font-['Arial'] font-bold text-[8px] uppercase">выручка</span>
              </div>
            </div>
          )}

          {/* Поиск */}
          <input
            type="text"
            placeholder="🔍 Поиск по имени или телефону..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-[40px] bg-white/10 text-white placeholder-white/40 rounded-[12px] px-[14px] font-['Arial'] font-bold text-[12px] outline-none"
          />
        </header>

        {/* Контент */}
        <div className="flex-1 w-full overflow-y-auto no-scrollbar p-[20px]">
          {loading ? (
            <div className="flex w-full h-full items-center justify-center pt-[40px]">
              <span className="text-[#FF008C] font-['Benzin'] animate-pulse">Загрузка...</span>
            </div>
          ) : error ? (
            <div className="bg-[#FFE5E5] border border-[#FF0040] rounded-[16px] p-[20px] text-center">
              <span className="font-['Arial'] font-bold text-[12px] text-[#FF0040] uppercase">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center pt-[40px]">
              <span className="font-['Arial'] font-bold text-[12px] text-[#949494] uppercase">
                {search ? 'Никого не нашли 🤷' : 'Пока нет клиентов'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {filtered.map((c, idx) => {
                const isVIP = c.orders_count >= 5 || c.total_spent >= 3000;
                const daysSinceLast = Math.floor((Date.now() - new Date(c.last_order).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <motion.div
                    key={c.phone}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`w-full bg-white p-[14px] rounded-[18px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] border ${isVIP ? 'border-[#FFB800]' : 'border-[#E5E5EA]'}`}
                  >
                    <div className="flex items-start justify-between mb-[8px]">
                      <div className="flex flex-col gap-[2px] flex-1">
                        <div className="flex items-center gap-[6px]">
                          {isVIP && <span className="text-[12px]">👑</span>}
                          <span className="font-['Benzin'] font-extrabold text-[13px] text-[#333] uppercase leading-tight">{c.name}</span>
                        </div>
                        <a href={`tel:${c.phone}`} className="font-['Arial'] font-bold text-[11px] text-[#0088CC]">{c.phone}</a>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-['Benzin'] font-extrabold text-[14px] text-[#14FF00]">{c.total_spent.toLocaleString('ru-RU')}₽</span>
                        <span className="font-['Arial'] font-bold text-[8px] text-[#949494] uppercase">средний {c.avg_check}₽</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-[6px] mb-[8px]">
                      <span className="bg-[#F2F2F7] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#333] uppercase">📦 {c.orders_count} зак.</span>
                      {c.delivery_count > 0 && <span className="bg-[#E5F4FF] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#0088CC] uppercase">🛵 {c.delivery_count}</span>}
                      {c.pickup_count > 0 && <span className="bg-[#FFF4E5] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#FFB800] uppercase">🛍 {c.pickup_count}</span>}
                    </div>

                    <div className="flex flex-col gap-[4px] pt-[8px] border-t border-[#F2F2F7]">
                      <span className="font-['Arial'] font-bold text-[10px] text-[#666]">
                        🥤 <span className="text-[#FF008C]">{c.favorite_drink}</span> ({c.favorite_count}x)
                      </span>
                      {c.address && (
                        <span className="font-['Arial'] font-bold text-[9px] text-[#949494] truncate">📍 {c.address}</span>
                      )}
                      <span className="font-['Arial'] font-bold text-[9px] text-[#949494] uppercase">
                        🕒 {daysSinceLast === 0 ? 'сегодня' : daysSinceLast === 1 ? 'вчера' : `${daysSinceLast} дн. назад`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
