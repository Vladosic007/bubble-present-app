"use client";
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type OrderHist = { id: number; date: string; total: number; type: string; time: string | null; items: string[] };
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
  top_drinks: { name: string; qty: number }[];
  weekday_freq: number[];
  fav_weekday: number;
  fav_hour: number;
  avg_days_between: number;
  source: string;
  history: OrderHist[];
};
type SourceStat = { source: string; clients: number; orders: number; revenue: number };

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

function timeOfDay(hour: number): string {
  if (hour < 0) return '—';
  if (hour < 6) return `Ночью (${hour}:00)`;
  if (hour < 12) return `Утром (${hour}:00)`;
  if (hour < 17) return `Днём (${hour}:00)`;
  if (hour < 22) return `Вечером (${hour}:00)`;
  return `Поздно (${hour}:00)`;
}

export default function ClientsPage() {
  const [bossKey, setBossKey] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [stats, setStats] = useState<{ total_clients: number; total_revenue: number; total_orders: number } | null>(null);
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [view, setView] = useState<'clients' | 'sources'>('clients');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bubble_boss_pin');
    if (!saved) {
      setError('Доступ только для босса. Войди под PIN босса в админке.');
      setLoading(false);
      return;
    }
    setBossKey(saved);
  }, []);

  const load = (key: string) => {
    setLoading(true);
    fetch(`/api/admin/clients?period=${period}&hidden=${showHidden}`, { headers: { 'x-boss-key': key } })
      .then(async r => {
        if (!r.ok) { setError('Не удалось загрузить (PIN босса неверный?)'); setLoading(false); return; }
        const json = await r.json();
        setClients(json.clients || []);
        setSources(json.sources || []);
        setStats(json.stats || null);
        setLoading(false);
      })
      .catch(() => { setError('Ошибка соединения'); setLoading(false); });
  };

  useEffect(() => {
    if (!bossKey) return;
    load(bossKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossKey, period, showHidden]);

  const toggleHide = async (phone: string, hide: boolean) => {
    if (!bossKey) return;
    setBusy(phone);
    const res = await fetch('/api/admin/clients/hide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-boss-key': bossKey },
      body: JSON.stringify({ phone, action: hide ? 'hide' : 'unhide' }),
    }).catch(() => null);
    if (res && res.ok) {
      setClients(prev => prev.filter(c => c.phone !== phone));
    } else {
      alert('Не удалось. Попробуй ещё раз.');
    }
    setBusy(null);
  };

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
              <span className="text-[#FF008C] font-['Benzin'] font-extrabold text-[10px] uppercase tracking-wider">{showHidden ? 'Скрытые' : 'База клиентов'}</span>
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

          {/* Переключатель вида: Клиенты / Источники */}
          <div className="w-full h-[40px] bg-white/10 rounded-[12px] p-[3px] flex relative">
            <div
              className="absolute top-[3px] bottom-[3px] w-[calc(50%-2px)] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-[10px] transition-all duration-300 ease-out"
              style={{ left: view === 'clients' ? '3px' : 'calc(50% - 1px)' }}
            />
            <button onClick={() => setView('clients')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[10px] uppercase ${view === 'clients' ? 'text-white' : 'text-white/50'}`}>👥 Клиенты</button>
            <button onClick={() => setView('sources')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[10px] uppercase ${view === 'sources' ? 'text-white' : 'text-white/50'}`}>📊 Источники</button>
          </div>

          {/* Поиск + переключатель скрытых (только в виде «Клиенты») */}
          {view === 'clients' && (
            <div className="flex gap-[8px]">
              <input
                type="text"
                placeholder="🔍 Поиск по имени или телефону..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 h-[40px] bg-white/10 text-white placeholder-white/40 rounded-[12px] px-[14px] font-['Arial'] font-bold text-[12px] outline-none"
              />
              <button
                onClick={() => { setShowHidden(s => !s); setExpanded(null); }}
                className={`h-[40px] px-[12px] rounded-[12px] font-['Arial'] font-bold text-[10px] uppercase active:scale-95 shrink-0 ${showHidden ? 'bg-[#FF008C] text-white' : 'bg-white/10 text-white/60'}`}
              >
                {showHidden ? '👁 Скрытые' : '🙈'}
              </button>
            </div>
          )}
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
          ) : view === 'sources' ? (
            sources.length === 0 ? (
              <div className="text-center pt-[40px]">
                <span className="font-['Arial'] font-bold text-[12px] text-[#949494] uppercase">Пока нет данных по источникам</span>
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                <div className="bg-white rounded-[14px] p-[12px] border border-[#E5E5EA]">
                  <span className="font-['Arial'] font-bold text-[10px] text-[#949494] leading-snug">
                    📊 Откуда приходят клиенты. Метка <b>direct</b> — зашли напрямую (без ссылки с меткой).
                  </span>
                </div>
                {(() => {
                  const maxRev = Math.max(...sources.map(s => s.revenue), 1);
                  return sources.map((s, idx) => (
                    <motion.div
                      key={s.source}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="w-full bg-white rounded-[16px] p-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-[#E5E5EA]"
                    >
                      <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Benzin'] font-extrabold text-[13px] text-[#333] uppercase">
                          {s.source === 'direct' ? '🔗 Напрямую' : `🏷 ${s.source}`}
                        </span>
                        <span className="font-['Benzin'] font-extrabold text-[14px] text-[#14FF00]">{s.revenue.toLocaleString('ru-RU')}₽</span>
                      </div>
                      <div className="w-full h-[6px] bg-[#F2F2F7] rounded-full overflow-hidden mb-[8px]">
                        <div className="h-full bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-full" style={{ width: `${(s.revenue / maxRev) * 100}%` }} />
                      </div>
                      <div className="flex gap-[8px]">
                        <span className="bg-[#F2F2F7] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#333] uppercase">👤 {s.clients} клиент.</span>
                        <span className="bg-[#F2F2F7] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#333] uppercase">📦 {s.orders} зак.</span>
                        <span className="bg-[#F2F2F7] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#333] uppercase">~{Math.round(s.revenue / s.orders)}₽ чек</span>
                      </div>
                    </motion.div>
                  ));
                })()}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="text-center pt-[40px]">
              <span className="font-['Arial'] font-bold text-[12px] text-[#949494] uppercase">
                {showHidden ? 'Скрытых нет' : search ? 'Никого не нашли 🤷' : 'Пока нет клиентов'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {filtered.map((c, idx) => {
                const isVIP = c.orders_count >= 5 || c.total_spent >= 3000;
                const daysSinceLast = Math.floor((Date.now() - new Date(c.last_order).getTime()) / (1000 * 60 * 60 * 24));
                const isOpen = expanded === c.phone;
                const maxWd = Math.max(...c.weekday_freq, 1);
                return (
                  <motion.div
                    key={c.phone}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`w-full bg-white rounded-[18px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] border overflow-hidden ${isVIP ? 'border-[#FFB800]' : 'border-[#E5E5EA]'}`}
                  >
                    {/* Верхняя часть — кликабельна для раскрытия */}
                    <div className="p-[14px] cursor-pointer" onClick={() => setExpanded(isOpen ? null : c.phone)}>
                      <div className="flex items-start justify-between mb-[8px]">
                        <div className="flex flex-col gap-[2px] flex-1">
                          <div className="flex items-center gap-[6px]">
                            {isVIP && <span className="text-[12px]">👑</span>}
                            <span className="font-['Benzin'] font-extrabold text-[13px] text-[#333] uppercase leading-tight">{c.name}</span>
                          </div>
                          <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="font-['Arial'] font-bold text-[11px] text-[#0088CC] w-fit">{c.phone}</a>
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
                        {c.avg_days_between > 0 && <span className="bg-[#F0E5FF] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#9C27B0] uppercase">🔁 ~{c.avg_days_between} дн.</span>}
                        {c.source && c.source !== 'direct' && <span className="bg-[#E5FFE9] px-[8px] py-[4px] rounded-[8px] font-['Arial'] font-bold text-[9px] text-[#14a800] uppercase">🏷 {c.source}</span>}
                      </div>

                      <div className="flex items-center justify-between pt-[8px] border-t border-[#F2F2F7]">
                        <span className="font-['Arial'] font-bold text-[10px] text-[#666]">
                          🥤 <span className="text-[#FF008C]">{c.favorite_drink}</span> ({c.favorite_count}x)
                        </span>
                        <span className="font-['Arial'] font-bold text-[9px] text-[#949494] uppercase">
                          {daysSinceLast === 0 ? '🕒 сегодня' : daysSinceLast === 1 ? '🕒 вчера' : `🕒 ${daysSinceLast} дн.`} {isOpen ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Раскрытая часть — подробная аналитика */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#FAFAFB] border-t border-[#E5E5EA]"
                        >
                          <div className="p-[14px] flex flex-col gap-[12px]">
                            {/* Привычки */}
                            <div className="flex flex-col gap-[6px]">
                              <span className="font-['Benzin'] font-extrabold text-[9px] text-[#FF008C] uppercase">📊 Привычки</span>
                              {c.fav_weekday >= 0 && (
                                <span className="font-['Arial'] font-bold text-[10px] text-[#333]">📅 Чаще заказывает: <span className="text-[#9C27B0]">{WEEKDAYS_FULL[c.fav_weekday]}</span></span>
                              )}
                              {c.fav_hour >= 0 && (
                                <span className="font-['Arial'] font-bold text-[10px] text-[#333]">⏰ Любимое время: <span className="text-[#9C27B0]">{timeOfDay(c.fav_hour)}</span></span>
                              )}
                              {c.avg_days_between > 0 && (
                                <span className="font-['Arial'] font-bold text-[10px] text-[#333]">🔁 Заказывает в среднем раз в <span className="text-[#9C27B0]">{c.avg_days_between} дн.</span></span>
                              )}
                              <span className="font-['Arial'] font-bold text-[10px] text-[#333]">🗓 Клиент с {new Date(c.first_order).toLocaleDateString('ru-RU')}</span>
                            </div>

                            {/* График по дням недели */}
                            <div className="flex flex-col gap-[4px]">
                              <span className="font-['Benzin'] font-extrabold text-[9px] text-[#FF008C] uppercase">📆 По дням недели</span>
                              <div className="flex items-end justify-between gap-[3px] h-[44px]">
                                {c.weekday_freq.map((cnt, i) => (
                                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-[2px] h-full">
                                    <div
                                      className={`w-full rounded-[3px] ${cnt > 0 ? 'bg-gradient-to-t from-[#FF008C] to-[#FF00EE]' : 'bg-[#E5E5EA]'}`}
                                      style={{ height: `${Math.max((cnt / maxWd) * 100, 6)}%` }}
                                      title={`${cnt} зак.`}
                                    />
                                    <span className="font-['Arial'] font-bold text-[7px] text-[#949494]">{WEEKDAYS[i]}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Топ напитков */}
                            {c.top_drinks.length > 0 && (
                              <div className="flex flex-col gap-[4px]">
                                <span className="font-['Benzin'] font-extrabold text-[9px] text-[#FF008C] uppercase">🏆 Топ напитков</span>
                                {c.top_drinks.map((d, i) => (
                                  <div key={i} className="flex items-center justify-between">
                                    <span className="font-['Arial'] font-bold text-[10px] text-[#333]">{i + 1}. {d.name}</span>
                                    <span className="font-['Arial'] font-bold text-[10px] text-[#FF008C]">{d.qty}x</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* История заказов */}
                            <div className="flex flex-col gap-[4px]">
                              <span className="font-['Benzin'] font-extrabold text-[9px] text-[#FF008C] uppercase">🧾 История ({c.history.length})</span>
                              <div className="flex flex-col gap-[6px] max-h-[200px] overflow-y-auto no-scrollbar">
                                {c.history.map((h) => (
                                  <div key={h.id} className="bg-white rounded-[10px] p-[8px] border border-[#E5E5EA]">
                                    <div className="flex items-center justify-between mb-[2px]">
                                      <span className="font-['Arial'] font-bold text-[9px] text-[#333]">
                                        {new Date(h.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        <span className="text-[#949494]"> · {WEEKDAYS[(new Date(h.date).getDay() + 6) % 7]}</span>
                                      </span>
                                      <span className="font-['Benzin'] font-extrabold text-[10px] text-[#14FF00]">{h.total}₽</span>
                                    </div>
                                    <span className="font-['Arial'] font-bold text-[8px] text-[#949494] uppercase">
                                      {h.type === 'delivery' ? '🛵 Доставка' : '🛍 Самовывоз'}{h.time ? ` · к ${h.time}` : ''}
                                    </span>
                                    <div className="font-['Arial'] text-[8px] text-[#666] mt-[2px]">{h.items.join(', ')}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Кнопка скрыть / вернуть */}
                            <button
                              onClick={() => toggleHide(c.phone, !showHidden)}
                              disabled={busy === c.phone}
                              className={`w-full h-[38px] rounded-[10px] font-['Arial'] font-bold text-[10px] uppercase active:scale-95 disabled:opacity-50 ${showHidden ? 'bg-[#14FF00] text-white' : 'bg-[#FFE5E5] text-[#FF0040]'}`}
                            >
                              {busy === c.phone ? '...' : showHidden ? '↩️ Вернуть в базу' : '🙈 Это сотрудник / тест — скрыть'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
