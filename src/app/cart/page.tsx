"use client";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCartStore, CartItem } from '../../store/cartStore'; 
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// ❗ СТРОГАЯ ТИПИЗАЦИЯ КАРТОЧКИ ❗
interface SwipeableCartItemProps {
  item: CartItem;
  changeQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  currentItemPrice: number;
}

const SwipeableCartItem = ({ item, changeQuantity, removeItem, currentItemPrice }: SwipeableCartItemProps) => {
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
    setTranslateX(diff > 0 ? diff : 0);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    setTouchStart(null);
    if (translateX > 150) removeItem(item.cartItemId);
    else if (translateX > 40) setTranslateX(80);
    else setTranslateX(0);
  };

  return (
    <div className="relative w-[346px] h-[139px] shrink-0 overflow-hidden rounded-[25px] touch-pan-y mx-auto">
      <div 
        className="absolute top-0 bottom-0 left-0 bg-[#FF0040] flex items-center justify-start overflow-hidden z-0"
        style={{ width: `${Math.max(translateX, 0)}px`, transition: isSwiping ? 'none' : 'width 0.3s ease-out' }}
      >
        <button onClick={() => removeItem(item.cartItemId)} className="w-[80px] h-full flex-shrink-0 flex items-center justify-center active:bg-black/10 transition-colors">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>

      <article 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${translateX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s ease-out' }}
        className="absolute inset-0 w-full h-full bg-[#FFFFFF]/20 box-border border border-[#FFFFFF]/40 shadow-[0_5px_5.7px_4px_rgba(255,0,140,0.25)] backdrop-blur-[30px] rounded-[25px] flex z-10"
      >
        <div className="absolute left-[12px] top-[16px] w-[112px] h-[107px] rounded-[15px] shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] overflow-hidden bg-white/50 pointer-events-none">
          <Image src={item.img} alt={item.name} fill className="object-cover" />
        </div>
        <div className="absolute left-[140px] top-[16px] flex items-center justify-center bg-gradient-to-r from-[#FF00EE]/20 to-[#FF008C]/20 border border-[#FFFFFF]/40 shadow-[0_4px_6px_2px_rgba(8,0,255,0.15)] backdrop-blur-[30px] rounded-full px-[10px] py-[4px] pointer-events-none max-w-[140px]">
          <h2 className="text-[#FF00EE] uppercase font-['Benzin'] font-extrabold text-[8px] leading-tight drop-shadow-[0_0_2px_white] whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</h2>
        </div>
        <ul className="absolute left-[140px] top-[54px] flex flex-col gap-[8px] pointer-events-none">
          {item.toppings?.map((topping: string, index: number) => (
            <li key={index} className="flex items-center text-[#949494] font-bold text-[8px] leading-none uppercase" style={{ fontFamily: "'Benzin-Regular', sans-serif" }}><span className="w-1 h-1 bg-[#949494] rounded-full mr-[4px] shrink-0" />{topping}</li>
          ))}
        </ul>
        <div className="absolute right-[16px] top-[8px] w-[30px] h-[30px] rounded-full bg-[#D9D9D9] flex items-center justify-center font-['Benzin'] font-extrabold text-[15px] text-white uppercase drop-shadow-sm pointer-events-none">{item.size}</div>
        
        <button onClick={(e) => { e.stopPropagation(); changeQuantity(item.cartItemId, -1); }} className="absolute left-[265px] top-[62px] w-[20px] h-[20px] active:scale-95 transition-transform flex items-center justify-center z-20">
          <Image src="/icons/minus.svg" alt="-" fill className="object-contain" />
        </button>
        
        <div className="absolute left-[293px] top-[62px] h-[20px] flex items-center justify-center pointer-events-none">
          <span className="font-['Benzin'] font-extrabold text-[17px] text-[#949494] tracking-[0.02em] leading-none">{item.quantity}</span>
        </div>
        
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (item.quantity < 9) changeQuantity(item.cartItemId, 1); 
            else alert("Бро, максимум 9 штук одного напитка в одни руки! 🧋");
          }} 
          className="absolute left-[310px] top-[62px] w-[20px] h-[20px] active:scale-95 transition-transform flex items-center justify-center z-20"
        >
          <Image src="/icons/plus.svg" alt="+" fill className="object-contain" />
        </button>

        <div className="absolute right-[16px] bottom-[16px] pointer-events-none">
          <span className="font-['Benzin'] font-extrabold text-[16px] tracking-[0.02em] leading-none bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text uppercase">
            {currentItemPrice * item.quantity} руб
          </span>
        </div>
      </article>
    </div>
  );
};

export default function CartPage() {
  const router = useRouter();
  
  const { 
    items, changeQuantity, removeItem, orderType, clearCart,
    activeOrderId, activeOrderStatus, orderCreatedAt,
    setActiveOrder, updateOrderStatus, clearActiveOrder
  } = useCartStore();
  
  const [isPaying, setIsPaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [dbPrices, setDbPrices] = useState<Record<string, { pickup: number, delivery: number }>>({});

  const BOT_TOKEN = '8754447020:AAEcItcGHk2sgrUHD_i534QmnN7HvV0GOy4';
  const CHAT_ID = '-1002342434566'; 
  const TOPIC_ID = '15103'; 

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

  const getCorrectItemPrice = (item: CartItem) => {
    const cleanItemName = normalizeString(item.name);
    let basePrices = dbPrices[cleanItemName];

    if (!basePrices) {
      const foundKey = Object.keys(dbPrices).find(k => k.includes(cleanItemName) || cleanItemName.includes(k));
      if (foundKey) {
        basePrices = dbPrices[foundKey];
      }
    }

    if (!basePrices) return item.price; 

    const basePrice = orderType === 'delivery' ? basePrices.delivery : basePrices.pickup;

    let toppingsPrice = 0;
    if (Array.isArray(item.toppings)) {
      item.toppings.forEach((t: string) => {
        const tLower = t.toLowerCase();
        if (tLower.includes('сырн')) toppingsPrice += 70;
        if (tLower.includes('2x') || tLower.includes('2х')) toppingsPrice += 80;
      });
    }

    return basePrice + toppingsPrice;
  };

  const dynamicTotal = items.reduce((sum, item) => sum + (getCorrectItemPrice(item) * item.quantity), 0);

  useEffect(() => {
    const checkActualStatus = async () => {
      if (!activeOrderId) return;
      
      const { data, error } = await supabase
        .from('orders')
        .select('status, created_at') 
        .eq('id', activeOrderId)
        .single();

      if (error || !data) {
        clearActiveOrder();
        return;
      }

      const dbTime = new Date(data.created_at).getTime();
      if (data.status !== activeOrderStatus || dbTime !== orderCreatedAt) {
        setActiveOrder(activeOrderId, data.status, dbTime);
      }
    };

    checkActualStatus();
  }, [activeOrderId, activeOrderStatus, orderCreatedAt, setActiveOrder, clearActiveOrder]);

  useEffect(() => {
    if (!activeOrderId) return;

    const channel = supabase
      .channel(`order_tracking_${activeOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` },
        (payload) => {
          updateOrderStatus(payload.new.status);
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
      updateOrderStatus('cancelled');
      
      // Отправляем сирену в Телегу ТОЛЬКО если заказ уже был оплачен!
      if (previousStatus !== 'pending_payment') {
        const cancelMessage = `❌ ЗАКАЗ #${activeOrderId} ОТМЕНЕН КЛИЕНТОМ ❌\n\nКлиент передумал и отменил заказ. Не готовьте его! Возврат средств!`;
        
        const tgPayload: any = {
          chat_id: CHAT_ID,
          message_thread_id: TOPIC_ID,
          text: cancelMessage,
        };

        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tgPayload)
        }).catch(err => console.error('Ошибка отправки отмены в ТГ', err));
      }
    }
  };

  const handleCheckoutClick = async () => {
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

    const orderId = data[0].id;

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          amount: dynamicTotal,
          description: `Заказ #${orderId} (Bubble Present)`,
          email: savedEmail,
          items: formattedItems
        }),
      });

      const paymentData = await response.json();

      if (paymentData.confirmation_url) {
        const dbTime = new Date(data[0].created_at).getTime();
        setActiveOrder(orderId, 'pending_payment', dbTime); 
        clearCart(); 
        window.location.href = paymentData.confirmation_url;
      } else {
        throw new Error('Нет ссылки на оплату');
      }
    } catch (err) {
      console.error('Ошибка инициализации оплаты:', err);
      alert("Не удалось запустить оплату. Обратитесь к баристе.");
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
              onClick={() => { clearActiveOrder(); router.push('/'); }}
              className="w-full h-[52px] rounded-[20px] bg-[#F2F2F7] text-[#333] font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
            >
              Сделать новый заказ
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  if (activeOrderId && activeOrderStatus && statusConfig[activeOrderStatus]) {
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

            {/* ❗ КНОПКА ОТМЕНЫ ТЕПЕРЬ ЕСТЬ ВСЕГДА ❗ */}
            {activeOrderStatus === 'pending_payment' ? (
              <button 
                onClick={() => handleCancelOrder(false)}
                className="w-full h-[52px] rounded-[20px] border border-[#FF0040]/30 text-[#FF0040] font-['Arial'] font-bold uppercase text-[12px] mb-[12px] active:scale-95 transition-all active:bg-[#FFE5E5]"
              >
                Отменить заказ (Не оплачен)
              </button>
            ) : timeLeft > 0 && ['accepted', 'preparing'].includes(activeOrderStatus) ? (
              <button 
                onClick={() => handleCancelOrder(false)}
                className="w-full h-[52px] rounded-[20px] border border-[#FF0040]/30 text-[#FF0040] font-['Arial'] font-bold uppercase text-[12px] mb-[12px] active:scale-95 transition-all active:bg-[#FFE5E5]"
              >
                Отменить заказ ({formatTime(timeLeft)})
              </button>
            ) : null}

            {activeOrderStatus === 'completed' ? (
              <button 
                onClick={() => { clearActiveOrder(); router.push('/'); }}
                className="w-full h-[52px] rounded-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
              >
                Отлично, спасибо!
              </button>
            ) : (
              <button 
                onClick={() => router.push('/')}
                className="w-full h-[52px] rounded-[20px] bg-[#F2F2F7] text-[#949494] font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
              >
                В меню (Свернуть)
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

  return (
    <div className="bg-[#F2F2F7] min-h-[100dvh] w-full flex justify-center overflow-hidden font-sans relative">
      <main className="w-full max-w-[370px] relative bg-[#FFFFFF] flex flex-col h-[100dvh] overflow-hidden">
        
        <div className="flex-1 w-full overflow-y-auto no-scrollbar pb-[310px] overflow-x-hidden touch-pan-y">
          <header className="relative w-full flex items-center justify-center pt-[32px] mb-[24px] shrink-0 pointer-events-none">
              <div className="relative h-[40px] w-[180px]">
                <Image src="/images/logo.jpg" alt="Bubble Present" fill className="object-contain" priority />
              </div>
          </header>
          <section className="relative w-full flex flex-col items-center space-y-[16px] px-[12px]">
            {items.map(item => (
              <SwipeableCartItem 
                key={item.cartItemId} 
                item={item} 
                changeQuantity={changeQuantity} 
                removeItem={removeItem} 
                currentItemPrice={getCorrectItemPrice(item)}
              />
            ))}
          </section>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-[292px] rounded-t-[25px] bg-[#FFFFFF]/20 backdrop-blur-[30px] z-30 flex flex-col pointer-events-none" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px -4px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
          <div className="pt-[24px] pl-[16px] pb-[32px] pointer-events-auto flex items-center justify-between pr-[16px]">
            <span className="font-['Benzin'] font-extrabold text-[16px] uppercase tracking-[0.02em]" style={{ color: 'rgba(65, 63, 64, 0.4)' }}>
              Итого: {dynamicTotal} руб
            </span>
            <span className="font-['Benzin'] font-extrabold text-[10px] uppercase text-[#FF008C]">{orderType === 'delivery' ? 'Доставка' : 'Самовывоз'}</span>
          </div>
          
          <button 
            onClick={handleCheckoutClick} disabled={isPaying}
            className="w-[346px] h-[49px] mx-auto rounded-[25px] bg-gradient-to-r from-[#FF00EE]/20 to-[#FF008C]/20 backdrop-blur-[30px] flex items-center justify-center shrink-0 active:scale-95 transition-transform pointer-events-auto shadow-[0_4px_6px_2px_rgba(8,0,255,0.15)] relative overflow-hidden"
            style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4)' }}
          >
            {isPaying ? (
              <span className="font-['Benzin'] font-extrabold text-[18px] text-white uppercase animate-pulse">Оплата...</span>
            ) : (
              <span className="font-['Benzin'] font-extrabold text-[18px] text-[#FF00EE] uppercase drop-shadow-[0_0_2px_white]">Оплатить (ЮKassa)</span>
            )}
          </button>
        </div>

        {isPaying && <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm" />}
      </main>
    </div>
  );
}