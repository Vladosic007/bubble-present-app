"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCartStore } from '../../../store/cartStore'; 
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // ❗ Проверь путь к твоему supabase

// === СЛОВАРЬ ПЕРЕВОДА (База -> Ссылки/Картинки) ===
const slugMap: Record<string, string> = {
  'Чоко банан': 'choco-banana1',
  'Чизкейк': 'cheesecake1',
  'Взрывная карамель': 'exploding-caramel',
  'Халва': 'halva1',
  'Красотка в розовом': 'pretty-in-pink1',
  'Рот фронт': 'rot-front1',
  'Тоффи бум': 'toffee-boom1',
  'Сырный раф': 'cheese-raf1',
  'Сникерс': 'snickers1',
  'Клубника-базилик': 'straw-basil',
  'Дубайский': 'dubai1',
  'Бамбл': 'bumble'
};

export default function CoffeeMenu() {
  const { orderType, setOrderType } = useCartStore();
  const [coffeeDrinks, setCoffeeDrinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ❗ Стейт для Умной Аватарки ❗
  const [avatar, setAvatar] = useState('/images/avatar.jpg');

  // ❗ Достаем фотку профиля из памяти ❗
  useEffect(() => {
    const savedPhoto = localStorage.getItem('bubble_user_photo');
    if (savedPhoto) {
      setAvatar(savedPhoto);
    }
  }, []);

  // ❗ ТЯНЕМ МЕНЮ ИЗ БАЗЫ + ФИЛЬТРУЕМ СТОП-ЛИСТ ❗
  useEffect(() => {
    const fetchDrinks = async () => {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .eq('category', 'Бабл кофе')
        .eq('is_active', true) // Скрываем выключенные баристой
        .order('id', { ascending: true });

      if (data && !error) {
        // Превращаем данные из БД в формат для наших карточек
        const formatted = data.map(d => {
          const slug = slugMap[d.name] || 'default-slug';
          return {
            id: slug,
            name: d.name,
            pickupPrice: d.price_pickup,
            deliveryPrice: d.price_delivery,
            img: `/images/${slug}.jpg`,
            href: `/menu/coffee/${slug}`,
            temp_type: d.temp_type
          };
        });
        setCoffeeDrinks(formatted);
      }
      setIsLoading(false);
    };

    fetchDrinks();

    // ❗ РЕАЛТАЙМ МАГИЯ: Напитки исчезают в прямом эфире ❗
    const channel = supabase.channel('realtime_coffee_menu')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drinks', filter: "category=eq.Бабл кофе" },
        () => {
          fetchDrinks(); // Если бариста дернул тумблер - обновляем список
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 pb-[180px] flex flex-col items-center bg-[#FAFAFA] min-h-screen">
       
      {/* === ЗАГОЛОВОК С ЛОГОТИПОМ === */}
      <div className="w-full max-w-[370px] flex items-center justify-between mb-6 mt-2 relative h-[40px]">
        
        {/* Пустой блок слева для баланса */}
        <div className="w-[34px]"></div>

        {/* ЛОГОТИП СТРОГО ПО ЦЕНТРУ */}
        <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 active:scale-95 transition-transform flex justify-center items-center">
          <Image
            src="/images/logo.jpg" 
            alt="Логотип кофейни"
            width={160} 
            height={45}
            quality={100}
            className="object-contain"
          />
        </Link>

        {/* ❗ ОБНОВЛЕННАЯ АВАТАРКА СПРАВА ❗ */}
        <Link href="/profile" className="w-[34px] h-[34px] rounded-full overflow-hidden shrink-0 shadow-sm active:scale-90 transition-transform bg-[#E5E5EA]">
          <Image 
            src={avatar} 
            alt="Профиль" 
            width={34} 
            height={34} 
            quality={100}
            className="object-cover w-full h-full" 
            unoptimized // Важно для пользовательских фоток
          />
        </Link>
      </div>

      {/* ❗❗❗ ПЕРЕКЛЮЧАТЕЛЬ САМОВЫВОЗ / ДОСТАВКА ❗❗❗ */}
      <div className="w-full max-w-[346px] h-[44px] bg-[#E5E5EA] rounded-[22px] p-[4px] flex relative mb-[16px] shrink-0">
        <motion.div
          className="absolute top-[4px] bottom-[4px] w-[calc(50%-4px)] bg-white rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          animate={{ left: orderType === 'pickup' ? '4px' : '50%' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        
        <button
          onClick={() => setOrderType('pickup')}
          className={`flex-1 flex justify-center items-center relative z-10 font-['Benzin'] text-[10px] font-extrabold uppercase transition-colors duration-300 ${orderType === 'pickup' ? 'text-[#FF008C]' : 'text-[#8E8E93]'}`}
        >
          Самовывоз
        </button>
        
        <button
          onClick={() => setOrderType('delivery')}
          className={`flex-1 flex justify-center items-center relative z-10 font-['Benzin'] text-[10px] font-extrabold uppercase transition-colors duration-300 ${orderType === 'delivery' ? 'text-[#FF008C]' : 'text-[#8E8E93]'}`}
        >
          Доставка
        </button>
      </div>

      {/* === БОЛЬШОЙ ЗАГОЛОВОК === */}
      <div className="w-full max-w-[370px] flex justify-start mt-[8px] mb-[32px]">
        <div className="flex items-center">
          <h1 className="text-[28px] leading-none font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-[1px] whitespace-nowrap">
            Бабл-кофе
          </h1>
        </div>
      </div>

      {/* === СЕТКА НАПИТКОВ === */}
      {isLoading ? (
        <div className="w-full flex justify-center mt-10">
          <span className="text-[#FF008C] font-['Benzin'] animate-pulse text-[14px] uppercase tracking-wider">
            Загрузка меню...
          </span>
        </div>
      ) : (
        <div className="w-full max-w-[370px] grid grid-cols-2 gap-x-[24px] gap-y-[32px] justify-items-center">
          {coffeeDrinks.map((drink) => (
            <DrinkCard key={drink.id} drink={drink} />
          ))}
        </div>
      )}
    </div>
  );
}

// === КОМПОНЕНТ КАРТОЧКИ (С УМНОЙ ЦЕНОЙ И ИКОНКАМИ) ===
function DrinkCard({ drink }: { drink: any }) {
  const { orderType } = useCartStore();
  const currentPrice = orderType === 'delivery' ? drink.deliveryPrice : drink.pickupPrice;

  return (
    <Link 
      href={drink.href}
      className="relative w-[170px] h-[188px] bg-white rounded-[25px] shadow-[0px_5px_5.7px_4px_rgba(255,0,140,0.25)] shrink-0 block active:scale-95 transition-transform duration-300"
    >
      
      {/* Картинка */}
      <div className="absolute top-0 left-0 w-[170px] h-[162px] rounded-t-[25px] overflow-hidden z-0">
        <Image
          src={drink.img} 
          alt={drink.name}
          fill
          className="object-cover"
        />
        
        {/* УМНЫЕ Иконки температуры (Берутся из базы) */}
        <div className="absolute top-[10px] left-[10px] flex flex-col gap-[4px] z-10">
          {/* Показываем огонь только если напиток бывает горячим */}
          {(drink.temp_type === 'hot_cold' || drink.temp_type === 'hot_only') && (
            <div className="w-[22px] h-[22px] rounded-full bg-[#FFFFFF]/20 backdrop-blur-md border border-[#FFFFFF]/30 flex items-center justify-center shadow-sm">
              <Image src="/icons/fire.svg" alt="Огонь" width={18} height={18} className="object-contain" />
            </div>
          )}
          {/* Показываем снежинку только если напиток бывает холодным */}
          {(drink.temp_type === 'hot_cold' || drink.temp_type === 'cold_only') && (
            <div className="w-[22px] h-[22px] rounded-full bg-[#FFFFFF]/20 backdrop-blur-md border border-[#FFFFFF]/30 flex items-center justify-center shadow-sm">
              <Image src="/icons/snow.svg" alt="Снежинка" width={18} height={18} className="object-contain" />
            </div>
          )}
        </div>
        
        <div 
          className="absolute bottom-0 left-0 w-full h-[40px] z-0" 
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 93%)' }}
        />
      </div>

      {/* Плашка с названием */}
      <div className="absolute bottom-[14px] left-[5px] w-[160px] h-[24px] bg-gradient-to-r from-[#FF00EE]/20 to-[#FF008C]/20 backdrop-blur-md border border-[#FFFFFF]/40 box-border rounded-full flex items-center justify-center shadow-[0px_4px_6px_2px_rgba(8,0,255,0.15)] z-10 px-2">
        <span className={`${drink.name.length > 10 ? 'text-[7px]' : 'text-[10px]'} font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-wider leading-none whitespace-nowrap`}>
          {drink.name}
        </span>
      </div>

      {/* Лента с ценой */}
      <div className="absolute -top-[7px] -right-[4px] w-[73px] h-[64px] z-20 pointer-events-none">
        <Image 
          src="/icons/ribbon.svg" 
          alt="Лента" 
          fill 
          className="object-contain" 
        />
        <div className="absolute inset-0 flex items-center justify-center pb-[12px] pl-[14px]">
          <div className="w-[62px] h-[11px] transform rotate-[42deg] flex items-center justify-center">
            <span className="text-white text-[8px] leading-none font-extrabold uppercase tracking-wide whitespace-nowrap">
              ОТ {currentPrice} РУБ
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}