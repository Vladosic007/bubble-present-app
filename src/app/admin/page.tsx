"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [adminKey, setAdminKey] = useState(''); // PIN для серверных запросов
  const [activeTab, setActiveTab] = useState<'orders' | 'drinks' | 'toppings' | 'promos'>('orders');
  
  const [drinks, setDrinks] = useState<any[]>([]);
  const [toppings, setToppings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // === СТЕЙТЫ БОССА (ПРОМОКОДЫ) ===
  const [isBoss, setIsBoss] = useState(false);
  const [showBossPrompt, setShowBossPrompt] = useState(false);
  const [bossPin, setBossPin] = useState('');
  
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [newPromoLimit, setNewPromoLimit] = useState('');

  useEffect(() => {
    // Авто-вход в режим босса ТОЛЬКО если есть сохранённый PIN — иначе все запросы будут падать с 403
    const savedBossPin = localStorage.getItem('bubble_boss_pin');
    if (savedBossPin) {
      setBossKey(savedBossPin);
      setIsBoss(true);
    }
  }, []);

  // === ЛОГИКА АВТОРИЗАЦИИ ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Проверяем PIN на сервере (заказы отдаются только с верным ключом)
    try {
      const res = await fetch('/api/admin/orders', { headers: { 'x-admin-key': pin } });
      if (res.ok) {
        setAdminKey(pin);
        setIsAuthenticated(true);
        const json = await res.json();
        setOrders(json.orders || []);
        fetchSideData();
      } else {
        alert('Неверный PIN-код!');
        setPin('');
      }
    } catch {
      alert('Ошибка соединения. Попробуй ещё раз.');
    }
    setIsLoading(false);
  };

  // Заказы — через защищённый серверный роут
  const fetchOrders = async (key = adminKey) => {
    try {
      const res = await fetch('/api/admin/orders', { headers: { 'x-admin-key': key } });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      }
    } catch {}
  };

  // Напитки/топпинги/промокоды — пока напрямую (там нет персональных данных)
  const fetchSideData = async () => {
    const { data: drinksData } = await supabase.from('drinks').select('*').order('id', { ascending: true });
    const { data: toppingsData } = await supabase.from('toppings').select('*').order('id', { ascending: true });
    const { data: promosData } = await supabase.from('promocodes').select('*').order('created_at', { ascending: false });

    if (drinksData) setDrinks(drinksData);
    if (toppingsData) setToppings(toppingsData);
    if (promosData) setPromocodes(promosData);
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchOrders(), fetchSideData()]);
    setIsLoading(false);
  };

  // Опрос новых заказов каждые 10 сек (вместо realtime, т.к. база закрыта)
  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(poll);
  }, [isAuthenticated, adminKey]);

  // === ЛОГИКА ТУМБЛЕРОВ ===
  const toggleDrink = async (id: number, currentStatus: boolean) => {
    setDrinks(drinks.map(d => d.id === id ? { ...d, is_active: !currentStatus } : d));
    const res = await fetch('/api/admin/drink-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ id, is_active: !currentStatus }),
    }).catch(() => null);
    if (!res || !res.ok) setDrinks(drinks.map(d => d.id === id ? { ...d, is_active: currentStatus } : d));
  };

  const toggleTopping = async (id: number, currentStatus: boolean) => {
    setToppings(toppings.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
    const res = await fetch('/api/admin/topping-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ id, is_active: !currentStatus }),
    }).catch(() => null);
    if (!res || !res.ok) setToppings(toppings.map(t => t.id === id ? { ...t, is_active: currentStatus } : t));
  };

  // === ИЗМЕНЕНИЕ СТАТУСА ЗАКАЗА ===
  const changeOrderStatus = async (id: number, newStatus: string) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    await fetch('/api/admin/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ orderId: id, status: newStatus }),
    }).catch(() => {});
  };

  // === ЛОГИКА ПРОМОКОДОВ И БОССА ===
  const handleTabClick = (tab: any) => {
    if (tab === 'promos' && !isBoss) {
      setShowBossPrompt(true);
      return;
    }
    setActiveTab(tab);
  };

  const [bossKey, setBossKey] = useState(''); // PIN босса для серверных запросов

  const handleBossAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/boss-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: bossPin }),
      });
      if (res.ok) {
        setBossKey(bossPin);
        setIsBoss(true);
        setShowBossPrompt(false);
        setActiveTab('promos');
        localStorage.setItem('bubble_boss_mode', 'true');
        localStorage.setItem('bubble_boss_pin', bossPin); // запоминаем для следующих заходов
        setBossPin('');
      } else {
        alert('Неверный PIN босса!');
        setBossPin('');
      }
    } catch {
      alert('Ошибка соединения');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode || !newPromoDiscount) return;
    const code = newPromoCode.trim().toUpperCase();
    const discount = parseInt(newPromoDiscount);
    const limit = newPromoLimit ? parseInt(newPromoLimit) : null;

    try {
      const res = await fetch('/api/admin/promo-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-boss-key': bossKey },
        body: JSON.stringify({ code, discount_percent: discount, usage_limit: limit }),
      });
      if (!res.ok) {
        alert('Ошибка! Возможно такой код уже существует.');
        return;
      }
      const { promo } = await res.json();
      setPromocodes([promo, ...promocodes]);
      setNewPromoCode(''); setNewPromoDiscount(''); setNewPromoLimit('');
    } catch {
      alert('Ошибка соединения');
    }
  };

  const togglePromo = async (id: string, currentStatus: boolean) => {
    setPromocodes(promocodes.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    const res = await fetch('/api/admin/promo-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-boss-key': bossKey },
      body: JSON.stringify({ id, is_active: !currentStatus }),
    }).catch(() => null);
    if (!res || !res.ok) setPromocodes(promocodes.map(p => p.id === id ? { ...p, is_active: currentStatus } : p));
  };

  // === ЭКРАН ВХОДА ===
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#110A1A] flex items-center justify-center font-sans">
        <div className="w-full max-w-[340px] bg-[#FFFFFF]/10 backdrop-blur-xl border border-[#FFFFFF]/20 p-[30px] rounded-[30px] flex flex-col items-center shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="w-[60px] h-[60px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-full flex items-center justify-center mb-[20px] shadow-[0_0_20px_rgba(255,0,238,0.4)]">
              <span className="text-[24px]">🔐</span>
          </div>
          <h1 className="text-white font-['Benzin'] font-extrabold text-[18px] uppercase mb-[24px] tracking-wide text-center">
            Панель Баристы
          </h1>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-[16px]">
            <input 
              type="password" placeholder="Введите PIN" value={pin} onChange={(e) => setPin(e.target.value)}
              className="w-full h-[50px] bg-black/30 border border-white/20 rounded-[15px] text-center text-white font-['Benzin'] text-[16px] outline-none focus:border-[#FF008C] transition-colors tracking-[0.2em]"
              // ❗ МЕСТО №2: МЕНЯЕМ ЛИМИТ ЦИФР ТУТ (ставим 6) ❗
              maxLength={6} 
            />
            <button type="submit" className="w-full h-[50px] rounded-[15px] bg-white text-black font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  // === ГЛАВНАЯ ПАНЕЛЬ АДМИНА ===
  return (
    <div className="min-h-[100dvh] w-full bg-[#F2F2F7] flex justify-center font-sans overflow-hidden">
      <main className="w-full max-w-[402px] h-full relative bg-[#FFFFFF] flex flex-col h-[100dvh]">
        
        <header className="w-full pt-[40px] pb-[20px] px-[24px] bg-[#110A1A] rounded-b-[30px] shadow-md z-20 shrink-0">
          <div className="flex items-center justify-between mb-[24px]">
            <div className="flex flex-col">
              <span className="text-[#FF008C] font-['Benzin'] font-extrabold text-[12px] uppercase tracking-wider">God Mode</span>
              <span className="text-white font-['Benzin'] font-extrabold text-[18px] uppercase">Управление</span>
            </div>
            <button onClick={() => { fetchData(); }} className="w-[40px] h-[40px] bg-white/10 rounded-full flex items-center justify-center active:scale-95">
              <span className="text-[16px]">🔄</span>
            </button>
          </div>

          <div className="w-full h-[44px] bg-white/10 rounded-[15px] p-[4px] flex relative">
            <div 
              className="absolute top-[4px] bottom-[4px] w-[calc(25%-2px)] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-[12px] transition-all duration-300 ease-out"
              style={{ left: activeTab === 'orders' ? '4px' : activeTab === 'drinks' ? 'calc(25% + 1px)' : activeTab === 'toppings' ? 'calc(50%)' : 'calc(75% - 4px)' }}
            />
            <button onClick={() => handleTabClick('orders')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[9px] uppercase transition-colors ${activeTab === 'orders' ? 'text-white' : 'text-white/50'}`}>Заказы</button>
            <button onClick={() => handleTabClick('drinks')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[9px] uppercase transition-colors ${activeTab === 'drinks' ? 'text-white' : 'text-white/50'}`}>Напитки</button>
            <button onClick={() => handleTabClick('toppings')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[9px] uppercase transition-colors ${activeTab === 'toppings' ? 'text-white' : 'text-white/50'}`}>Стоп</button>
            <button onClick={() => handleTabClick('promos')} className={`flex-1 relative z-10 font-['Arial'] font-bold text-[9px] uppercase transition-colors ${activeTab === 'promos' ? 'text-white' : 'text-white/50'}`}>Промики</button>
          </div>
        </header>

        <div className="flex-1 w-full overflow-y-auto no-scrollbar p-[24px] bg-[#F2F2F7]">
          {isLoading ? (
            <div className="flex w-full h-full items-center justify-center">
              <span className="text-[#FF008C] font-['Benzin'] animate-pulse">Загрузка базы...</span>
            </div>
          ) : (
            <>
              {activeTab === 'orders' && (
                <div className="flex flex-col gap-[16px]">
                  {orders.map(order => {
                    const isCancelled = order.status === 'cancelled';
                    return (
                      <div key={order.id} className={`w-full p-[16px] rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border flex flex-col gap-[12px] transition-colors duration-300 ${isCancelled ? 'bg-[#FFE5E5] border-[#FF0040]' : 'bg-white border-[#E5E5EA]'}`}>
                        {isCancelled && (
                          <div className="w-full bg-[#FF0040] text-white font-['Benzin'] font-extrabold text-[10px] uppercase py-[8px] text-center rounded-[8px] animate-pulse">
                            ❌ ОТМЕНЕН КЛИЕНТОМ (Не готовить!)
                          </div>
                        )}
                        <div className="flex justify-between items-start border-b border-[#F2F2F7] pb-[8px]">
                          <div className="flex flex-col">
                            <span className={`font-['Benzin'] font-extrabold text-[14px] uppercase ${isCancelled ? 'text-[#FF0040]' : 'text-[#FF00EE]'}`}>
                              Заказ #{order.id}
                            </span>
                            <span className="font-['Arial'] font-bold text-[10px] text-[#949494] uppercase">
                              {order.order_type === 'delivery' ? 'Доставка' : 'Самовывоз'}
                            </span>
                          </div>
                          <span className={`font-['Benzin'] font-extrabold text-[14px] ${isCancelled ? 'text-[#FF0040]' : 'text-[#333]'}`}>{order.total} ₽</span>
                        </div>
                        <div className="flex flex-col gap-[4px]">
                          <span className="font-['Arial'] font-bold text-[12px] text-[#333] uppercase">👤 {order.customer_name} ({order.phone})</span>
                          {order.order_type === 'delivery' && (
                            <span className="font-['Arial'] font-bold text-[10px] text-[#0088CC] uppercase">📍 {order.address}</span>
                          )}
                        </div>
                        <div className={`flex flex-col gap-[4px] p-[10px] rounded-[10px] ${isCancelled ? 'bg-white/50' : 'bg-[#F9F9F9]'}`}>
                          {JSON.parse(order.items || '[]').map((item: any, idx: number) => (
                            <span key={idx} className={`font-['Arial'] font-bold text-[10px] uppercase ${isCancelled ? 'text-[#FF0040]/70 line-through' : 'text-[#616161]'}`}>
                              • {item.name} x{item.qty}
                            </span>
                          ))}
                        </div>
                        {!isCancelled && (
                          <div className="flex flex-wrap gap-[8px] mt-[4px]">
                            <button onClick={() => changeOrderStatus(order.id, 'accepted')} className={`flex-1 min-w-[30%] h-[36px] rounded-[10px] font-['Arial'] font-bold text-[9px] uppercase transition-colors ${order.status === 'accepted' ? 'bg-[#333] text-white' : 'bg-[#F2F2F7] text-[#949494]'}`}>Принят 🆕</button>
                            <button onClick={() => changeOrderStatus(order.id, 'preparing')} className={`flex-1 min-w-[30%] h-[36px] rounded-[10px] font-['Arial'] font-bold text-[9px] uppercase transition-colors ${order.status === 'preparing' ? 'bg-[#FFB800] text-white' : 'bg-[#F2F2F7] text-[#949494]'}`}>Колдует 🧑‍🍳</button>
                            {order.order_type === 'delivery' ? (
                              <>
                                <button onClick={() => changeOrderStatus(order.id, 'ready_for_courier')} className={`flex-1 min-w-[45%] h-[36px] rounded-[10px] font-['Arial'] font-bold text-[9px] uppercase transition-colors ${order.status === 'ready_for_courier' ? 'bg-[#9C27B0] text-white' : 'bg-[#F2F2F7] text-[#949494]'}`}>Ждет курьера 📦</button>
                                <button onClick={() => changeOrderStatus(order.id, 'delivering')} className={`flex-1 min-w-[45%] h-[36px] rounded-[10px] font-['Arial'] font-bold text-[9px] uppercase transition-colors ${order.status === 'delivering' ? 'bg-[#0088CC] text-white' : 'bg-[#F2F2F7] text-[#949494]'}`}>В пути 🛵</button>
                              </>
                            ) : (
                              <button onClick={() => changeOrderStatus(order.id, 'ready_for_pickup')} className={`flex-1 min-w-[45%] h-[36px] rounded-[10px] font-['Arial'] font-bold text-[9px] uppercase transition-colors ${order.status === 'ready_for_pickup' ? 'bg-[#9C27B0] text-white' : 'bg-[#F2F2F7] text-[#949494]'}`}>Ждет выдачи 🛍</button>
                            )}
                            <button onClick={() => changeOrderStatus(order.id, 'completed')} className={`flex-1 min-w-[100%] h-[36px] rounded-[10px] font-['Arial'] font-bold text-[10px] uppercase transition-colors ${order.status === 'completed' ? 'bg-[#14FF00] text-white shadow-md' : 'bg-[#F2F2F7] text-[#949494]'}`}>{order.order_type === 'delivery' ? 'Доставлен ✅' : 'Выдан ✅'}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {orders.length === 0 && (
                    <span className="text-center font-['Arial'] font-bold text-[#949494] uppercase text-[12px] mt-[20px]">Активных заказов нет</span>
                  )}
                </div>
              )}

              {activeTab === 'drinks' && (
                <div className="flex flex-col gap-[12px]">
                  {drinks.map(drink => (
                    <div key={drink.id} className="w-full bg-white p-[16px] rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-between border border-[#E5E5EA]">
                      <div className="flex flex-col gap-[4px] w-[70%]">
                        <span className="font-['Arial'] font-bold text-[14px] text-[#333] uppercase leading-tight">{drink.name}</span>
                        <span className="font-['Arial'] font-bold text-[10px] text-[#949494] uppercase">{drink.category} • {drink.price_pickup}₽</span>
                      </div>
                      <button onClick={() => toggleDrink(drink.id, drink.is_active)} className={`w-[50px] h-[30px] rounded-full p-[2px] transition-colors duration-300 ease-in-out flex shrink-0 ${drink.is_active ? 'bg-[#14FF00]' : 'bg-[#D1D1D6]'}`}>
                        <motion.div layout className="w-[26px] h-[26px] bg-white rounded-full shadow-md" animate={{ x: drink.is_active ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'toppings' && (
                <div className="flex flex-col gap-[12px]">
                  {toppings.map(topping => (
                    <div key={topping.id} className="w-full bg-white p-[16px] rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-between border border-[#E5E5EA]">
                      <div className="flex flex-col gap-[4px] w-[70%]">
                        <span className="font-['Arial'] font-bold text-[14px] text-[#333] uppercase leading-tight">{topping.name}</span>
                      </div>
                      <button onClick={() => toggleTopping(topping.id, topping.is_active)} className={`w-[50px] h-[30px] rounded-full p-[2px] transition-colors duration-300 ease-in-out flex shrink-0 ${topping.is_active ? 'bg-[#14FF00]' : 'bg-[#D1D1D6]'}`}>
                        <motion.div layout className="w-[26px] h-[26px] bg-white rounded-full shadow-md" animate={{ x: topping.is_active ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Вкладка Промокодов */}
              {activeTab === 'promos' && (
                <div className="flex flex-col gap-[16px]">
                  {/* Форма создания */}
                  <form onSubmit={handleCreatePromo} className="w-full bg-white p-[16px] rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-[#E5E5EA] flex flex-col gap-[12px]">
                    <h2 className="font-['Benzin'] font-extrabold text-[12px] uppercase text-[#FF008C]">Создать код</h2>
                    <input type="text" placeholder="КОД (напр. BUBBLE20)" value={newPromoCode} onChange={e => setNewPromoCode(e.target.value)} required className="w-full h-[40px] bg-[#F2F2F7] rounded-[10px] px-3 font-bold text-[12px] outline-none uppercase" />
                    <div className="flex gap-[12px]">
                      <input type="number" placeholder="Скидка %" value={newPromoDiscount} onChange={e => setNewPromoDiscount(e.target.value)} required min="1" max="99" className="flex-1 h-[40px] bg-[#F2F2F7] rounded-[10px] px-3 font-bold text-[12px] outline-none" />
                      <input type="number" placeholder="Лимит (шт)" value={newPromoLimit} onChange={e => setNewPromoLimit(e.target.value)} min="1" className="flex-1 h-[40px] bg-[#F2F2F7] rounded-[10px] px-3 font-bold text-[12px] outline-none" />
                    </div>
                    <button type="submit" className="w-full h-[40px] bg-[#333] text-white rounded-[10px] font-bold text-[10px] uppercase active:scale-95 transition-transform">Создать</button>
                  </form>

                  {/* Список */}
                  {promocodes.map(promo => (
                    <div key={promo.id} className={`w-full bg-white p-[16px] rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-between border ${!promo.is_active ? 'border-[#FF0040] opacity-60' : 'border-[#E5E5EA]'}`}>
                      <div className="flex flex-col gap-[4px]">
                        <span className="font-['Benzin'] font-extrabold text-[14px] text-[#333] uppercase leading-tight">{promo.code} <span className="text-[#FF008C]">-{promo.discount_percent}%</span></span>
                        <span className="font-['Arial'] font-bold text-[10px] text-[#949494] uppercase">Использовано: {promo.used_count} {promo.usage_limit ? `из ${promo.usage_limit}` : '(без лимита)'}</span>
                      </div>
                      <button onClick={() => togglePromo(promo.id, promo.is_active)} className={`w-[50px] h-[30px] rounded-full p-[2px] transition-colors duration-300 ease-in-out flex shrink-0 ${promo.is_active ? 'bg-[#14FF00]' : 'bg-[#FF0040]'}`}>
                        <motion.div layout className="w-[26px] h-[26px] bg-white rounded-full shadow-md" animate={{ x: promo.is_active ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Модальное окно PIN-кода Босса */}
        <AnimatePresence>
          {showBossPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[#110A1A]/90 backdrop-blur-md flex items-center justify-center p-[24px]">
              <div className="w-full max-w-[320px] bg-white p-[24px] rounded-[30px] shadow-2xl flex flex-col items-center">
                <span className="text-[40px] mb-[12px]">👑</span>
                <h2 className="font-['Benzin'] font-extrabold text-[14px] uppercase text-center mb-[8px]">Доступ руководства</h2>
                <p className="text-[10px] text-center text-[#949494] font-bold uppercase mb-[24px]">Введите PIN-код владельца</p>
                <form onSubmit={handleBossAuth} className="w-full flex flex-col gap-[12px]">
                  <input type="password" value={bossPin} onChange={e => setBossPin(e.target.value)} placeholder="PIN" maxLength={4} className="w-full h-[50px] bg-[#F2F2F7] rounded-[15px] text-center font-['Benzin'] tracking-[0.2em] outline-none" />
                  <div className="flex gap-[8px]">
                    <button type="button" onClick={() => setShowBossPrompt(false)} className="flex-1 h-[40px] bg-[#F2F2F7] text-[#949494] rounded-[10px] font-bold text-[10px] uppercase">Отмена</button>
                    <button type="submit" className="flex-1 h-[40px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[10px] font-bold text-[10px] uppercase shadow-md">Войти</button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}