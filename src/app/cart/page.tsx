"use client";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCartStore, CartItem } from '../../store/cartStore'; 
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const OPENING_PROMO_END = new Date('2026-06-01'); // Дата окончания акции — поменяй если нужно
const IS_OPENING_DAY = new Date() < OPENING_PROMO_END;

interface SwipeableCartItemProps {
  item: CartItem;
  changeQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  currentItemPrice: number;
  originalPrice?: number;
}

const SwipeableCartItem = ({ item, changeQuantity, removeItem, currentItemPrice, originalPrice }: SwipeableCartItemProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.targetTouches[0].clientX - touchStart;
    // Только свайп влево (отрицательные значения)
    setTranslateX(diff < 0 ? diff : 0);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    setTouchStart(null);
    if (translateX < -100) removeItem(item.cartItemId);
    else setTranslateX(0);
  };

  const displaySize = item.size === 'M' ? '500 мл' : item.size === 'L' ? '700 мл' : item.size;

  return (
    <div className="relative w-[346px] shrink-0 overflow-hidden rounded-[22px] mx-auto touch-pan-y">
      {/* Красная зона удаления — справа */}
      <div
        className="absolute top-0 right-0 bottom-0 bg-[#FF0040] flex items-center justify-center z-0 rounded-r-[22px]"
        style={{ width: `${Math.max(-translateX, 0)}px`, transition: isSwiping ? 'none' : 'width 0.3s ease-out' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </div>

      {/* Карточка */}
      <article
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${translateX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s ease-out' }}
        className="relative w-full bg-white rounded-[22px] shadow-[0_4px_20px_rgba(255,0,140,0.18)] border border-[#FFE8F8] flex items-center p-[12px] gap-[12px] z-10"
      >
        {/* Фото */}
        <div className="relative w-[95px] h-[95px] rounded-[15px] overflow-hidden shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <Image src={item.img} alt={item.name} fill className="object-cover" />
        </div>

        {/* Контент */}
        <div className="flex-1 flex flex-col" style={{ minHeight: '95px' }}>
          {/* Название + размер */}
          <div className="flex items-start justify-between mb-[6px]">
            <div className="bg-gradient-to-r from-[#FF00EE]/15 to-[#FF008C]/15 border border-[#FF00EE]/25 rounded-[10px] px-[8px] py-[4px] max-w-[155px]">
              <span className="text-[#FF00EE] font-['Benzin'] font-extrabold text-[9px] uppercase leading-tight">
                {item.name}
              </span>
            </div>
            <div className="bg-[#F2F2F7] rounded-[10px] px-[7px] py-[4px] shrink-0 ml-[4px]">
              <span className="font-['Benzin'] font-bold text-[8px] text-[#999] uppercase">
                {displaySize}
              </span>
            </div>
          </div>

          {/* Дополнения */}
          {item.toppings && item.toppings.length > 0 && (
            <div className="flex flex-col gap-[3px] mb-[8px]">
              {item.toppings.map((topping: string, index: number) => (
                <span key={index} className="text-[9px] text-[#ABABAB] font-bold uppercase flex items-center gap-[5px]">
                  <span className="w-[3px] h-[3px] rounded-full bg-[#D0D0D0] shrink-0" />
                  {topping}
                </span>
              ))}
            </div>
          )}

          {/* Кнопки кол-ва + цена */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-[10px]">
              <button
                onClick={(e) => { e.stopPropagation(); if (item.quantity > 1) changeQuantity(item.cartItemId, -1); else removeItem(item.cartItemId); }}
                className="w-[30px] h-[30px] rounded-full bg-[#F2F2F7] flex items-center justify-center active:scale-90 transition-transform"
              >
                <Image src="/icons/minus.svg" alt="-" width={12} height={12} className="object-contain" />
              </button>
              <span className="font-['Benzin'] font-extrabold text-[17px] text-[#333] w-[18px] text-center leading-none">
                {item.quantity}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); if (item.quantity < 9) changeQuantity(item.cartItemId, 1); else alert("У нас можно только максимум 9 одинаковых напитков))) 🧋"); }}
                className="w-[30px] h-[30px] rounded-full bg-[#F2F2F7] flex items-center justify-center active:scale-90 transition-transform"
              >
                <Image src="/icons/plus.svg" alt="+" width={12} height={12} className="object-contain" />
              </button>
            </div>

            {/* Цена */}
            <div className="flex flex-col items-end">
              {originalPrice && originalPrice > currentItemPrice && (
                <span className="text-[10px] text-[#C8C8C8] line-through font-['Benzin'] leading-none mb-[2px]">
                  {originalPrice * item.quantity} руб
                </span>
              )}
              <span className="font-['Benzin'] font-extrabold text-[19px] leading-none bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text">
                {currentItemPrice * item.quantity} руб
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default function CartPage() {
  const router = useRouter();
  
  const { 
    items, changeQuantity, removeItem, orderType, clearCart,
    activeOrders, addActiveOrder, updateOrderStatus, removeActiveOrder,
    setOrderType 
  } = useCartStore();

  const realActiveOrders = activeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  
  const safeIndex = Math.min(selectedOrderIndex, Math.max(0, realActiveOrders.length - 1));
  const currentActiveOrder = realActiveOrders[safeIndex] || activeOrders[activeOrders.length - 1]; 

  const activeOrderId = currentActiveOrder?.id;
  const activeOrderStatus = currentActiveOrder?.status;
  const orderCreatedAt = currentActiveOrder?.time;

  const [isHiddenStatus, setIsHiddenStatus] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [closeReason, setCloseReason] = useState(''); 
  const [isMounted, setIsMounted] = useState(false);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string, discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  const [isTimeOrder, setIsTimeOrder] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const min = now.getMinutes();
      const day = now.getDay(); 
      const totalMin = hour * 60 + min;

      const isWeekend = day === 0 || day === 6;
      const openTime = 660; 
      
      let closeTime = 0;
      if (orderType === 'pickup') {
        closeTime = isWeekend ? 1350 : 1290; 
      } else {
        closeTime = isWeekend ? 1320 : 1260; 
      }

      if (totalMin < openTime) {
        setIsOpen(false);
        setCloseReason('early');
      } else if (totalMin >= closeTime) {
        setIsOpen(false);
        setCloseReason('late');
      } else {
        setIsOpen(true);
        setCloseReason('');
      }
    };

    checkTime(); 
    const timer = setInterval(checkTime, 10000); 
    return () => clearInterval(timer);
  }, [orderType]);
  
  const [dbPrices, setDbPrices] = useState<Record<string, { pickup: number, delivery: number }>>({}); 

  const normalizeString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[\s\-\.,()]/g, '');
  };

  useEffect(() => {
    const fetchPrices = async () => {
      const { data, error } = await supabase.from('drinks').select('name, price_pickup, price_delivery');
      if (data && !error) {
        const pricesMap: Record<string, { pickup: number, delivery: number }> = {};
        data.forEach(d => {
          const cleanName = normalizeString(d.name);
          pricesMap[cleanName] = { pickup: d.price_pickup, delivery: d.price_delivery };
        });
        setDbPrices(pricesMap);
      }
    };
    fetchPrices();
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError('Введите код');
      return;
    }
    
    if (IS_OPENING_DAY && orderType === 'pickup') {
      setPromoError('Скидки не суммируются!');
      return;
    }

    setPromoError('');
    
    const { data, error } = await supabase
      .from('promocodes')
      .select('*')
      .eq('code', promoCodeInput.trim().toUpperCase())
      .single();

    if (error || !data) {
      setPromoError('Код не найден');
      return;
    }

    if (!data.is_active) {
      setPromoError('Код неактивен');
      return;
    }

    if (data.usage_limit && data.used_count >= data.usage_limit) {
      setPromoError('Лимит исчерпан');
      return;
    }

    setAppliedPromo({ code: data.code, discount: data.discount_percent });
    setPromoError('Применен!');
  };

  const getCorrectItemPrice = (item: CartItem, applyOpeningPromo = true) => {
    const cleanItemName = normalizeString(item.name);
    let basePrices = dbPrices[cleanItemName];

    if (!basePrices) {
      const foundKey = Object.keys(dbPrices).find(k => k.includes(cleanItemName) || cleanItemName.includes(k));
      if (foundKey) basePrices = dbPrices[foundKey];
    }

    if (!basePrices) {
      let fallbackPrice = item.price;
      if (applyOpeningPromo && IS_OPENING_DAY && orderType === 'pickup') {
        return Math.round(fallbackPrice / 2);
      }
      return fallbackPrice;
    }

    const basePrice = orderType === 'delivery' ? basePrices.delivery : basePrices.pickup;
    let toppingsPrice = 0;
    
    if (item.size === 'L') toppingsPrice += 60;

    if (Array.isArray(item.toppings)) {
      item.toppings.forEach((t: string) => {
        const tLower = t.toLowerCase();
        if (tLower.includes('сырн')) toppingsPrice += 70;
        if (tLower.includes('2x') || tLower.includes('2х')) toppingsPrice += 80;
      });
    }

    const fullPrice = basePrice + toppingsPrice;
    
    if (applyOpeningPromo && IS_OPENING_DAY && orderType === 'pickup') {
      return Math.round(fullPrice / 2);
    }
    
    return fullPrice;
  };

  const rawTotal = items.reduce((sum, item) => sum + (getCorrectItemPrice(item) * item.quantity), 0);
  const dynamicTotal = appliedPromo ? Math.round(rawTotal * (1 - appliedPromo.discount / 100)) : rawTotal;

  useEffect(() => {
    if (IS_OPENING_DAY && orderType === 'pickup' && appliedPromo) {
      setAppliedPromo(null);
      setPromoCodeInput('');
      setPromoError('Промокод сброшен (Акция)');
    }
  }, [orderType]);

  useEffect(() => {
    const checkActualStatus = async () => {
      if (!activeOrderId) return;
      
      const { data, error } = await supabase
        .from('orders')
        .select('status, created_at') 
        .eq('id', activeOrderId)
        .single();

      if (error || !data) {
          removeActiveOrder(activeOrderId);
          return;
        }

        const dbTime = new Date(data.created_at).getTime();
        if (data.status !== activeOrderStatus || dbTime !== orderCreatedAt) {
          updateOrderStatus(activeOrderId, data.status);
        }
      };

      const checkTimeout = () => {
      if (activeOrderStatus === 'pending_payment' && orderCreatedAt) {
        const elapsed = (Date.now() - orderCreatedAt) / 1000;
        if (elapsed > 600) { 
          handleCancelOrder(true);
        }
      }
    };

    checkActualStatus();
    checkTimeout();
  }, [activeOrderId, activeOrderStatus, orderCreatedAt, updateOrderStatus, removeActiveOrder]);

  useEffect(() => {
    if (!activeOrderId) return;

    const channel = supabase
      .channel(`order_tracking_${activeOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` },
        (payload) => {
          updateOrderStatus(activeOrderId, payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrderId, updateOrderStatus]);

  useEffect(() => {
    if (['accepted', 'preparing'].includes(activeOrderStatus || '') && orderCreatedAt) {
      const calculateTime = () => {
        const elapsed = Math.floor((Date.now() - orderCreatedAt) / 1000);
        const remaining = Math.max(120 - elapsed, 0); 
        setTimeLeft(remaining);
      };
      
      calculateTime();
      const timerId = setInterval(calculateTime, 1000);
      return () => clearInterval(timerId);
    }
  }, [activeOrderStatus, orderCreatedAt]);

  const handleCancelOrder = async (isAutoCancel = false) => {
    if (!activeOrderId) return;
    
    if (!isAutoCancel) {
      const confirmCancel = window.confirm("Ты уверен, что хочешь отменить заказ?");
      if (!confirmCancel) return;
    }

    const previousStatus = activeOrderStatus;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', activeOrderId);

    if (error) {
      if (!isAutoCancel) alert("Не удалось отменить заказ. Возможно, его уже начали готовить!");
    } else {
      updateOrderStatus(activeOrderId, 'cancelled');
      
      if (previousStatus !== 'pending_payment') {
        fetch('/api/cancel-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: activeOrderId }),
        }).catch(err => console.error('Ошибка отправки отмены в ТГ', err));
      }
    }
  };

  const handleCheckoutClick = async () => {
    if (realActiveOrders.length >= 2) {
      alert("Готовим твои заказы! Давай подождем, пока бариста их отдаст 🧋");
      return;
    }

    const savedPhone = localStorage.getItem('bubble_user_phone');
    const savedAddress = localStorage.getItem('bubble_user_address');
    const savedName = localStorage.getItem('bubble_user_name') || 'Гость';
    const savedEmail = localStorage.getItem('bubble_user_email');

    if (!savedPhone || savedPhone.length < 5) {
      alert("Укажите пожалуйста ваш номер телефона в Сведениях");
      router.push('/profile/info');
      return;
    }

    if (!savedEmail || !savedEmail.includes('@')) {
      alert("Укажите вашу электронную почту в Сведениях (нужна для чека)");
      router.push('/profile/info');
      return;
    }

    if (orderType === 'delivery' && (!savedAddress || savedAddress.length < 5)) {
      alert("Для доставки нужно указать адрес в Сведениях");
      router.push('/profile/info');
      return;
    }

    if (isTimeOrder) {
      if (!selectedTime) {
        alert("Укажите желаемое время заказа!");
        return;
      }
      
      const [selHour, selMin] = selectedTime.split(':').map(Number);
      const selTotalMin = selHour * 60 + selMin;
      const day = new Date().getDay();
      const isWeekend = day === 0 || day === 6;
      
      const openTime = 660; 
      const closeTime = orderType === 'pickup' 
        ? (isWeekend ? 1350 : 1290) 
        : (isWeekend ? 1320 : 1260);

      if (selTotalMin < openTime || selTotalMin >= closeTime) {
        alert(`Мы не сможем отдать заказ в это время!\nОткрываемся в 11:00, ${orderType === 'delivery' ? 'доставка' : 'самовывоз'} работает до ${Math.floor(closeTime/60)}:${closeTime%60 === 0 ? '00' : closeTime%60}.`);
        return;
      }
    }

    setIsPaying(true);

    const formattedItems = items.map((item: CartItem) => {
      const toppingsString = item.toppings && item.toppings.length > 0 
        ? ` (+ ${item.toppings.join(', ')})` 
        : '';
        
      return {
        name: `${item.name} (${item.size})${toppingsString}`,
        qty: item.quantity,
        price: getCorrectItemPrice(item) 
      };
    });

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: savedName,
          phone: savedPhone,
          address: savedAddress || '',
          items: JSON.stringify(formattedItems),
          total: dynamicTotal,
          order_type: orderType,
          status: 'pending_payment'
        }
      ])
      .select();

    if (error || !data || !data[0]) {
      setIsPaying(false);
      alert("Ошибка при создании заказа! Попробуй еще раз.");
      console.error(error);
      return;
    }

    // Инкрементируем промокод ТОЛЬКО после успешного создания заказа
    if (appliedPromo) {
      await supabase.rpc('increment_promocode_usage', { code_param: appliedPromo.code }).catch(() => {});
    }

    const orderId = data[0].id;
    const dbTime = new Date(data[0].created_at).getTime();

    const timeInfo = isTimeOrder ? `⏰ КО ВРЕМЕНИ: ${selectedTime}` : '🚀 КАК МОЖНО СКОРЕЕ';

    const tgMessage = `🚨 НОВЫЙ ЗАКАЗ #${orderId} 🚨\n\n` +
      `📦 Тип: ${orderType === 'delivery' ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ'}\n` +
      `${timeInfo}\n` +
      `👤 Имя: ${savedName}\n` +
      `📞 Телефон: ${savedPhone}\n` +
      (orderType === 'delivery' ? `📍 Адрес: ${savedAddress}\n\n` : `\n`) +
      `🛒 Заказ:\n` +
      formattedItems.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n') + `\n\n` +
      (appliedPromo ? `🎁 ПРОМОКОД: ${appliedPromo.code} (-${appliedPromo.discount}%)\n` : '') +
      `💰 Итого: ${dynamicTotal} руб.`;

    const isTestMode = savedName.trim().toUpperCase() === 'ТЕСТ';

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          amount: dynamicTotal,
          description: `Заказ #${orderId} (Bubble Present)`,
          email: savedEmail,
          items: formattedItems,
          tgMessage: tgMessage, 
          isTest: isTestMode    
        }),
      });

      const paymentData = await response.json();

      if (isTestMode) {
        await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId);
        addActiveOrder(orderId, 'accepted', dbTime);
        setIsHiddenStatus(false);
        clearCart();
        setIsPaying(false);
        alert("🛠 ТЕСТОВЫЙ РЕЖИМ: Заказ улетел в Телеграм без оплаты!");
        return; 
      }

      if (paymentData.confirmation_url) {
        localStorage.setItem('last_payment_url', paymentData.confirmation_url); 
        addActiveOrder(orderId, 'pending_payment', dbTime);
        setIsHiddenStatus(false);
        clearCart(); 
        setIsPaying(false); 

        const link = document.createElement('a');
        link.href = paymentData.confirmation_url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const errDetail = paymentData.yookassaError?.description || paymentData.yookassaError?.code || paymentData.error || 'Нет ссылки на оплату';
        throw new Error(errDetail);
      }
    } catch (err: any) {
      console.error('Ошибка инициализации оплаты:', err);
      const msg = err?.message || String(err);
      alert(`Не удалось запустить оплату.\n\n${msg}\n\nЕсли ошибка повторяется — обратитесь к баристе.`);
      setIsPaying(false);
    }
  };

  const statusConfig: Record<string, { title: string; desc: string; emoji: string; progress: string }> = {
    pending_payment: { title: "Ожидание оплаты", desc: "Перенаправляем в кассу...", emoji: "💳", progress: "5%" },
    accepted: { title: "Заказ оформлен", desc: "Мы получили твой заказ", emoji: "📝", progress: "15%" },
    preparing: { title: "Бариста колдует", desc: "Готовим с любовью", emoji: "🧑‍🍳", progress: "45%" },
    ready_for_courier: { title: "Ждет курьера", desc: "Скоро поедет к тебе", emoji: "📦", progress: "70%" },
    delivering: { title: "В пути", desc: "Курьер уже мчит", emoji: "🛵", progress: "85%" },
    ready_for_pickup: { title: "Ждет выдачи", desc: "Можно забирать", emoji: "🛍", progress: "90%" },
    completed: { title: "Заказ завершен", desc: "Приятного аппетита!", emoji: "✅", progress: "100%" }
  };

  if (activeOrderStatus === 'cancelled') {
    return (
      <div className="bg-[#F2F2F7] min-h-[100dvh] w-full flex justify-center overflow-hidden font-sans relative">
        <main className="w-full max-w-[370px] relative bg-[#FFFFFF] flex flex-col items-center h-[100dvh] justify-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center px-[24px]">
            <div className="w-[80px] h-[80px] bg-[#FFE5E5] rounded-full flex items-center justify-center mb-[24px]">
              <span className="text-[40px]">❌</span>
            </div>
            <h2 className="text-[24px] font-['Benzin'] font-extrabold text-[#FF0040] uppercase text-center leading-none mb-[16px]">
              Заказ отменен
            </h2>
            <p className="text-[12px] text-[#949494] font-['Arial'] font-bold uppercase text-center mb-[32px] leading-relaxed">
              Этот заказ был отменен.
            </p>
            <button 
              onClick={() => { if(activeOrderId) removeActiveOrder(activeOrderId); setIsHiddenStatus(false); router.push('/'); }}
              className="w-full h-[52px] rounded-[20px] bg-[#F2F2F7] text-[#333] font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
            >
              Сделать новый заказ
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  if (!isHiddenStatus && activeOrderId && activeOrderStatus && statusConfig[activeOrderStatus]) {
    const currentInfo = statusConfig[activeOrderStatus];

    return (
      <div className="bg-[#F2F2F7] min-h-[100dvh] w-full flex justify-center overflow-hidden font-sans relative">
        <main className="w-full max-w-[370px] relative bg-[#FFFFFF] flex flex-col items-center h-[100dvh]">
          <div className="flex flex-col items-center mt-[150px] w-full opacity-30">
            <div className="relative w-[214px] h-[310px] shrink-0 pointer-events-none">
              <Image src="/images/bubblik.png" alt="Пустая корзина" fill className="object-contain" priority />
            </div>
          </div>
          
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 w-full bg-white rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex flex-col items-center pt-[16px] px-[24px] pb-[40px]"
          >
            <div className="w-[40px] h-[5px] bg-[#E5E5EA] rounded-full mb-[24px]" />
            
            {realActiveOrders.length > 1 && (
              <div className="w-full flex gap-[8px] mb-[20px]">
                {realActiveOrders.map((order, idx) => (
                  <button 
                    key={order.id}
                    onClick={() => setSelectedOrderIndex(idx)}
                    className={`flex-1 h-[40px] rounded-[15px] font-['Benzin'] font-extrabold text-[10px] uppercase transition-all ${safeIndex === idx ? 'bg-[#FF008C] text-white shadow-md' : 'bg-[#F2F2F7] text-[#949494]'}`}
                  >
                    Заказ #{idx + 1}
                  </button>
                ))}
              </div>
            )}

            <h2 className="text-[24px] font-['Benzin'] font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase text-center leading-none mb-[8px]">
              Заказ #{activeOrderId}
            </h2>
            <p className="text-[12px] text-[#949494] font-['Arial'] font-bold uppercase mb-[32px]">
              {orderType === 'delivery' ? 'Доставка' : 'Самовывоз'}
            </p>

            <div className="w-full h-[8px] bg-[#F2F2F7] rounded-full overflow-hidden mb-[32px] relative">
               <motion.div 
                 initial={{ width: "0%" }} animate={{ width: currentInfo.progress }} transition={{ duration: 0.5, ease: "easeOut" }}
                 className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-full"
               />
            </div>

            <motion.div 
              key={activeOrderStatus}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="w-full flex items-center gap-[16px] bg-[#F9F9F9] p-[16px] rounded-[20px] mb-[24px]"
            >
               <div className="w-[48px] h-[48px] bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 text-[24px]">
                 {currentInfo.emoji}
               </div>
               <div className="flex flex-col">
                  <span className="text-[14px] font-['Arial'] font-bold text-[#333] uppercase">{currentInfo.title}</span>
                  <span className="text-[10px] text-[#949494] font-['Arial'] font-bold uppercase">{currentInfo.desc}</span>
               </div>
            </motion.div>

            {activeOrderStatus === 'pending_payment' && (
              <div className="w-full flex flex-col gap-[8px] mb-[12px]">
                <button 
                  onClick={() => {
                    const savedLink = localStorage.getItem('last_payment_url');
                    if (savedLink) window.location.href = savedLink;
                    else alert("Ссылка не найдена");
                  }}
                  className="w-full h-[52px] rounded-[20px] bg-[#FF00EE] text-white font-['Arial'] font-bold uppercase text-[12px] shadow-lg"
                >
                  Нажми сюда чтобы оплатить 💳
                </button>
                <button 
                  onClick={() => handleCancelOrder(false)}
                  className="w-full h-[40px] text-[#FF0040] font-['Arial'] font-bold uppercase text-[10px] opacity-60"
                >
                  Отменить заказ
                </button>
              </div>
            )}

            {activeOrderStatus === 'completed' ? (
              <button 
                onClick={() => { removeActiveOrder(activeOrderId); setIsHiddenStatus(false); }}
                className="w-full h-[52px] rounded-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
              >
                Отлично, спасибо!
              </button>
            ) : (
              <button 
                onClick={() => setIsHiddenStatus(true)}
                className="w-full h-[52px] rounded-[20px] bg-[#F2F2F7] text-[#949494] font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
              >
                Собрать новый заказ (Свернуть)
              </button>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#F2F2F7] min-h-[100dvh] w-full flex justify-center overflow-hidden font-sans">
        <main className="w-full max-w-[370px] relative bg-[#FFFFFF] flex flex-col items-center h-[100dvh]">
          
          {realActiveOrders.length > 0 && isHiddenStatus && (
            <div onClick={() => setIsHiddenStatus(false)} className="absolute top-[40px] w-[346px] bg-white rounded-[20px] p-[16px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-[#FF008C]/20 flex items-center justify-between z-50 cursor-pointer active:scale-95 transition-transform">
              <div className="flex flex-col">
                <span className="font-['Benzin'] font-extrabold text-[12px] uppercase text-[#333]">Активных заказов: {realActiveOrders.length}</span>
                <span className="font-['Arial'] font-bold text-[10px] uppercase text-[#949494]">Нажми, чтобы отследить 📦</span>
              </div>
              <div className="w-[30px] h-[30px] bg-[#FF008C]/10 rounded-full flex items-center justify-center text-[14px]">👀</div>
            </div>
          )}

          <div className="flex flex-col items-center mt-[232px] w-full">
            <div className="relative w-[214px] h-[310px] shrink-0 pointer-events-none">
              <Image src="/images/bubblik.png" alt="Пустая корзина" priority fill className="object-contain" />
            </div>
            <p className="mt-[48px] px-[46px] text-center text-[#000000]/40 font-medium text-[12px] tracking-[0.02em]" style={{ fontFamily: "'Benzin-Medium', sans-serif" }}>
              Вы еще ничего не добавили в корзину
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!isMounted) return <div className="bg-[#F2F2F7] min-h-[100dvh] w-full" />;

  return (
    <div className="bg-[#F2F2F7] min-h-[100dvh] w-full flex justify-center overflow-hidden font-sans relative">
      <main className="w-full max-w-[370px] relative bg-[#FFFFFF] flex flex-col h-[100dvh] overflow-hidden">
        
        <div className="flex-1 w-full overflow-y-auto no-scrollbar pb-[480px] overflow-x-hidden touch-pan-y">
          <AnimatePresence>
            {IS_OPENING_DAY && (
              <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="w-full bg-gradient-to-r from-[#FF00EE] to-[#FF008C] p-[10px] text-center z-50 shrink-0 shadow-md">
                <span className="text-white font-['Benzin'] font-extrabold text-[10px] uppercase tracking-wider">
                  🎉 ГРАНД ОТКРЫТИЕ! -50% НА САМОВЫВОЗ 🎉
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <header className="relative w-full flex items-center justify-center pt-[32px] mb-[24px] shrink-0 pointer-events-none">
              <div 
                onClick={() => router.push('/')} 
                className="relative h-[40px] w-[180px] pointer-events-auto cursor-pointer active:scale-95 transition-transform"
              >
                <Image src="/images/logo.jpg" alt="Bubble Present" fill className="object-contain" priority />
              </div>
          </header>

          {realActiveOrders.length > 0 && isHiddenStatus && (
            <div onClick={() => setIsHiddenStatus(false)} className="w-[346px] mx-auto mb-[16px] bg-white rounded-[20px] p-[16px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-[#FF008C]/20 flex items-center justify-between cursor-pointer active:scale-95 transition-transform z-10 relative">
              <div className="flex flex-col">
                <span className="font-['Benzin'] font-extrabold text-[12px] uppercase text-[#333]">Активных заказов: {realActiveOrders.length}</span>
                <span className="font-['Arial'] font-bold text-[10px] uppercase text-[#949494]">Нажми, чтобы отследить 📦</span>
              </div>
              <div className="w-[30px] h-[30px] bg-[#FF008C]/10 rounded-full flex items-center justify-center text-[14px]">👀</div>
            </div>
          )}

          <section className="relative w-full flex flex-col items-center space-y-[16px] px-[12px]">
            {items.map(item => (
              <SwipeableCartItem 
                key={item.cartItemId} 
                item={item} 
                changeQuantity={changeQuantity} 
                removeItem={removeItem} 
                currentItemPrice={getCorrectItemPrice(item)}
                originalPrice={getCorrectItemPrice(item, false)} 
              />
            ))}
          </section>
        </div>

        {/* Нижняя панель — редизайн */}
        <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[30px] z-30 flex flex-col px-[16px] pt-[14px] pb-[24px]" style={{ boxShadow: '0 -6px 30px rgba(255, 0, 140, 0.12), 0 -1px 0 rgba(255, 0, 140, 0.08)' }}>

          {/* Ручка */}
          <div className="w-[36px] h-[4px] bg-[#F0E0F0] rounded-full mx-auto mb-[14px]" />

          {/* 1. Промокод */}
          <div className="flex gap-[8px] mb-[4px]">
            <input
              type="text"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              placeholder="🎁 Промокод"
              disabled={!!appliedPromo || (IS_OPENING_DAY && orderType === 'pickup')}
              className="flex-1 h-[42px] bg-[#F7F7F7] rounded-[14px] px-[14px] text-[12px] font-bold outline-none placeholder:text-[#C8C8C8] disabled:opacity-50 border border-[#F0E8F8]"
            />
            {!appliedPromo ? (
              <button
                onClick={handleApplyPromo}
                disabled={IS_OPENING_DAY && orderType === 'pickup'}
                className="h-[42px] px-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] text-[11px] font-['Benzin'] font-extrabold uppercase shadow-[0_4px_12px_rgba(255,0,140,0.3)] active:scale-95 transition-transform disabled:opacity-40"
              >
                ОК
              </button>
            ) : (
              <button
                onClick={() => { setAppliedPromo(null); setPromoCodeInput(''); setPromoError(''); }}
                className="h-[42px] px-[16px] bg-[#FF0040] text-white rounded-[14px] text-[11px] font-['Benzin'] font-extrabold shadow-sm active:scale-95 transition-transform"
              >
                ✖
              </button>
            )}
          </div>
          {promoError && (
            <span className={`text-[9px] font-bold uppercase ml-[4px] mb-[8px] block ${promoError === 'Применен!' ? 'text-[#0DAA00]' : 'text-[#FF0040]'}`}>
              {promoError}
            </span>
          )}

          {/* 2. Тип заказа */}
          <div className="flex bg-[#F7F7F7] rounded-[16px] p-[3px] mb-[8px] mt-[6px]">
            <button
              onClick={() => setOrderType('pickup')}
              className={`flex-1 py-[10px] rounded-[13px] text-[11px] font-['Benzin'] font-extrabold uppercase transition-all ${orderType === 'pickup' ? 'bg-white shadow-sm text-[#FF008C]' : 'text-[#BBBBBB]'}`}
            >
              🏃 Самовывоз
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex-1 py-[10px] rounded-[13px] text-[11px] font-['Benzin'] font-extrabold uppercase transition-all ${orderType === 'delivery' ? 'bg-white shadow-sm text-[#FF008C]' : 'text-[#BBBBBB]'}`}
            >
              🚗 Доставка
            </button>
          </div>

          {/* 3. Время */}
          <div className="flex bg-[#F7F7F7] rounded-[16px] p-[3px] mb-[8px]">
            <button
              onClick={() => setIsTimeOrder(false)}
              className={`flex-1 py-[10px] rounded-[13px] text-[10px] font-['Benzin'] font-extrabold uppercase transition-all ${!isTimeOrder ? 'bg-white shadow-sm text-[#FF008C]' : 'text-[#BBBBBB]'}`}
            >
              ⚡ Побыстрее
            </button>
            <button
              onClick={() => setIsTimeOrder(true)}
              className={`flex-1 py-[10px] rounded-[13px] text-[10px] font-['Benzin'] font-extrabold uppercase transition-all ${isTimeOrder ? 'bg-white shadow-sm text-[#FF008C]' : 'text-[#BBBBBB]'}`}
            >
              ⏰ Ко времени
            </button>
          </div>
          <AnimatePresence>
            {isTimeOrder && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-[8px]">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full h-[46px] bg-[#F7F7F7] border border-[#F0E8F8] rounded-[14px] text-[16px] font-['Benzin'] font-bold outline-none text-center text-[#333]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {IS_OPENING_DAY && orderType === 'pickup' && (
            <div className="w-full bg-gradient-to-r from-[#FF00EE]/8 to-[#FF008C]/8 rounded-[12px] py-[6px] px-[12px] mb-[10px] text-center border border-[#FF008C]/10">
              <span className="text-[10px] font-['Benzin'] font-bold text-[#FF0040] uppercase">🎉 Акция: -50% на самовывоз! 🎉</span>
            </div>
          )}

          {/* 4. Итого */}
          <div className="flex items-center justify-between mb-[14px] px-[4px]">
            <div className="flex flex-col">
              <span className="font-['Benzin'] font-extrabold text-[13px] text-[#C8C8C8] uppercase tracking-wider">Итого</span>
              {appliedPromo && (
                <span className="text-[10px] text-[#C8C8C8] line-through font-['Benzin'] leading-none">{rawTotal} руб</span>
              )}
            </div>
            <div className="flex items-center gap-[8px]">
              {appliedPromo && (
                <span className="text-[10px] text-[#FF008C] bg-[#FF008C]/10 px-[8px] py-[3px] rounded-[8px] font-['Benzin'] font-bold">
                  -{appliedPromo.discount}%
                </span>
              )}
              <span className="font-['Benzin'] font-extrabold text-[26px] leading-none bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text">
                {dynamicTotal} руб
              </span>
            </div>
          </div>

          {/* 5. Кнопка оплаты */}
          <button
            onClick={handleCheckoutClick}
            disabled={isPaying || !isOpen}
            className={`w-full h-[54px] rounded-[20px] flex items-center justify-center font-['Benzin'] font-extrabold text-[16px] uppercase transition-all active:scale-95
              ${!isOpen
                ? 'bg-[#F7F7F7] text-[#C8C8C8] cursor-not-allowed'
                : isPaying
                  ? 'bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white opacity-80'
                  : 'bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white shadow-[0_6px_24px_rgba(255,0,140,0.4)]'
              }`}
          >
            {!isOpen ? (
              closeReason === 'early' ? '😴 Откроемся в 11:00' : '😴 На сегодня всё'
            ) : isPaying ? (
              <span className="animate-pulse">Оплата...</span>
            ) : (
              '💳 Оплатить (ЮKassa)'
            )}
          </button>

          <p className="text-[7px] text-[#D0D0D0] font-bold uppercase text-center mt-[10px] px-[20px] leading-tight">
            Напиток в доставке и самовывозе может быть видоизменен
          </p>
        </div>

        {isPaying && <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm" />}
      </main>
    </div>
  );
}