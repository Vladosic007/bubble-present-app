"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCartStore } from '../../../store/cartStore'; 
import { supabase } from '../../../lib/supabase';

// ❗ ИСПРАВЛЕННЫЙ СЛОВАРЬ (добавлены единички и точные названия файлов) ❗
const slugMap: Record<string, string> = {
  'нутелла': 'nutella1',
  'орео': 'oreo1', 
  'бабл милк ти': 'bubble-milk1',
  'молочная черника': 'blueberry1',
  'тайское караоке': 'caraoke1',
  'гранат кокос': 'pomegranate1',
  'чоко клубника': 'choco-straw1',
  'таро': 'taro1',
  'жасминовая клубника': 'jasmine-straw1',
  'морозная черника': 'frost-blueberry1',
  'малиновое облако': 'rasp-cloud1',
  'красная смородина': 'red-currant1',
  'цитрус': 'citrus1',
  'жасминовая малина': 'jasmine-rasp1',
  'маракуйя с содовой': 'passion-soda1',
  'жасминовый лайм': 'jasmine-lime',
  'рэд драгон': 'red-dragon1',
  'тай лун': 'tai-lung1',
  'облепиховая пряность': 'sea-buckthorn1',
  'жасминовый киви': 'jasmine-kiwi1',
  'лесной морс': 'forest-berries1',
  'тайский с апельсином': 'thai-orange',
  'ягодный микс': 'berry-mix1',
  'вельвет': 'velvet1',
  'вильвет': 'velvet1' // 👈 Защита от опечатки
};

const menuCategories = [
  { id: 'milk', label: 'Молочные' },
  { id: 'sweeter', label: 'Послаще' },
  { id: 'sour', label: 'Покислее' },
  { id: 'with-sour', label: 'С кислинкой' },
];

export default function TeaMenu() {
  const [activeCategory, setActiveCategory] = useState('milk');
  const menuRef = useRef<HTMLDivElement>(null); 
  const { orderType, setOrderType } = useCartStore();

  const [avatar, setAvatar] = useState('/images/avatar.jpg');

  const [milkDrinks, setMilkDrinks] = useState<any[]>([]);
  const [sweeterDrinks, setSweeterDrinks] = useState<any[]>([]);
  const [sourDrinks, setSourDrinks] = useState<any[]>([]);
  const [withSourDrinks, setWithSourDrinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedPhoto = localStorage.getItem('bubble_user_photo');
    if (savedPhoto) {
      setAvatar(savedPhoto);
    }
  }, []);

  useEffect(() => {
    const fetchDrinks = async () => {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .eq('category', 'Бабл милк ти')
        .eq('is_active', true) 
        .order('id', { ascending: true });

      if (data && !error) {
        const milk: any[] = [];
        const sweeter: any[] = [];
        const sour: any[] = [];
        const withSour: any[] = [];

        data.forEach(d => {
          const normalizedName = d.name.toLowerCase().trim();
          const slug = slugMap[normalizedName] || 'default-slug';
          
          let displayName = d.name;
          if (normalizedName === 'вильвет') {
            displayName = 'Вельвет';
          }

          const drinkObj = {
            id: slug,
            name: displayName,
            pickupPrice: d.price_pickup,
            deliveryPrice: d.price_delivery,
            img: `/images/${slug}.jpg`,
            href: `/menu/tea/${slug}`,
            temp_type: d.temp_type
          };

          if (d.subcategory === 'Молочные') milk.push(drinkObj);
          else if (d.subcategory === 'Послаще') sweeter.push(drinkObj);
          else if (d.subcategory === 'Покислее') sour.push(drinkObj);
          else if (d.subcategory === 'С кислинкой') withSour.push(drinkObj);
        });

        setMilkDrinks(milk);
        setSweeterDrinks(sweeter);
        setSourDrinks(sour);
        setWithSourDrinks(withSour);
      }
      setIsLoading(false);
    };

    fetchDrinks();

    const channel = supabase.channel('realtime_tea_menu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks', filter: "category=eq.Бабл милк ти" }, fetchDrinks)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; 
      for (let i = menuCategories.length - 1; i >= 0; i--) {
        const section = document.getElementById(menuCategories[i].id);
        if (section) {
          const sectionTop = section.getBoundingClientRect().top + window.scrollY;
          if (sectionTop <= scrollPosition) {
            setActiveCategory(menuCategories[i].id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuRef.current) {
      const activeButton = menuRef.current.querySelector(`[data-id="${activeCategory}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  return (
    <div className="flex flex-col items-center pb-[180px] bg-[#FAFAFA] min-h-screen relative">
      
      {/* === ЛИПКАЯ ШАПКА === */}
      <div className="sticky top-0 z-50 w-full flex flex-col items-center bg-[#FAFAFA]/90 backdrop-blur-xl border-b border-black/5 pt-6 pb-4 px-4 shadow-sm">
        
        {/* ❗ ЦЕНТРАЛЬНЫЙ ЛОГОТИП И АВАТАРКА ❗ */}
        <div className="w-full max-w-[370px] flex items-center justify-between mb-[16px] relative h-[40px]">
          <div className="w-[34px]"></div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center pointer-events-auto z-10">
            <Link href="/" className="active:scale-95 transition-transform flex justify-center items-center">
              <Image 
                src="/images/logo.jpg" 
                alt="Bubble Present" 
                width={160} 
                height={45} 
                className="object-contain"
                priority
              />
            </Link>
          </div>

          <Link href="/profile" className="w-[34px] h-[34px] rounded-full overflow-hidden shadow-sm active:scale-90 transition-transform duration-300 bg-[#E5E5EA] z-20">
            <Image 
              src={avatar} 
              alt="Профиль" 
              width={34} 
              height={34} 
              className="object-cover w-full h-full"
              unoptimized
            />
          </Link>
        </div>

        <div className="w-full max-w-[346px] h-[44px] bg-[#E5E5EA] rounded-[22px] p-[4px] flex relative mb-[16px] shrink-0">
          <motion.div
            className="absolute top-[4px] bottom-[4px] w-[calc(50%-4px)] bg-white rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            animate={{ left: orderType === 'pickup' ? '4px' : '50%' }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => setOrderType('pickup')}
            className={`flex-1 flex justify-center items-center relative z-10 font-['Benzin'] text-[10px] font-extrabold uppercase transition-colors duration-300 ${orderType === 'pickup' ? 'text-[#FF008C]' : 'text-[#8E8E93]'}`}
          >Самовывоз</button>
          <button
            onClick={() => setOrderType('delivery')}
            className={`flex-1 flex justify-center items-center relative z-10 font-['Benzin'] text-[10px] font-extrabold uppercase transition-colors duration-300 ${orderType === 'delivery' ? 'text-[#FF008C]' : 'text-[#8E8E93]'}`}
          >Доставка</button>
        </div>

        <div className="w-full max-w-[370px] flex items-center justify-center">
          <div ref={menuRef} className="flex items-center bg-[#D6D6D8] border border-white/50 shadow-[0px_4px_4px_rgba(0,0,0,0.05),inset_0px_2px_2px_rgba(255,255,255,0.6)] rounded-full px-2 py-2 gap-2 overflow-x-auto no-scrollbar w-[346px]">
            {menuCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button key={cat.id} data-id={cat.id} onClick={() => scrollToCategory(cat.id)} className="relative px-4 py-2 rounded-full shrink-0 outline-none">
                  {isActive && (
                    <motion.div layoutId="active-pill" className="absolute inset-0 bg-[#323232]/20 backdrop-blur-md border border-[#FFFFFF]/40 box-border rounded-full" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <span className={`relative z-10 text-[11px] leading-none font-extrabold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-[#333333]' : 'text-[#7A7A7A]'}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full flex justify-center mt-10">
          <span className="text-[#FF008C] font-['Benzin'] animate-pulse text-[14px] uppercase tracking-wider">
            Загрузка меню...
          </span>
        </div>
      ) : (
        <div className="w-full max-w-[370px] px-4 flex flex-col items-center mt-[10px]">
          
          {milkDrinks.length > 0 && (
            <>
              <div id="milk" className="w-full flex justify-start mb-[32px]">
                <h1 className="text-[28px] leading-none font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-[1px] whitespace-nowrap">Молочные</h1>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-[24px] gap-y-[32px] justify-items-center">
                {milkDrinks.map((drink) => <DrinkCard key={drink.id} drink={drink} />)}
              </div>
            </>
          )}

          {sweeterDrinks.length > 0 && (
            <>
              <div id="sweeter" className="w-full flex justify-start mt-[50px] mb-[32px]">
                <h2 className="text-[28px] leading-none font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-[1px] whitespace-nowrap">Послаще</h2>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-[24px] gap-y-[32px] justify-items-center">
                {sweeterDrinks.map((drink) => <DrinkCard key={drink.id} drink={drink} />)}
              </div>
            </>
          )}

          {sourDrinks.length > 0 && (
            <>
              <div id="sour" className="w-full flex justify-start mt-[50px] mb-[32px]">
                <h2 className="text-[28px] leading-none font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-[1px] whitespace-nowrap">Покислее</h2>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-[24px] gap-y-[32px] justify-items-center">
                {sourDrinks.map((drink) => <DrinkCard key={drink.id} drink={drink} />)}
              </div>
            </>
          )}

          {withSourDrinks.length > 0 && (
            <>
              <div id="with-sour" className="w-full flex justify-start mt-[50px] mb-[32px]">
                <h2 className="text-[28px] leading-none font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-[1px] whitespace-nowrap">С кислинкой</h2>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-[24px] gap-y-[32px] justify-items-center">
                {withSourDrinks.map((drink) => <DrinkCard key={drink.id} drink={drink} />)}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}

function DrinkCard({ drink }: { drink: any }) {
  const { orderType } = useCartStore();
  const currentPrice = orderType === 'delivery' ? drink.deliveryPrice : drink.pickupPrice;

  return (
    <Link 
      href={drink.href}
      className="relative w-[170px] h-[188px] bg-white rounded-[25px] shadow-[0px_5px_5.7px_4px_rgba(255,0,140,0.25)] shrink-0 block active:scale-95 transition-transform duration-300"
    >
      <div className="absolute top-0 left-0 w-[170px] h-[162px] rounded-t-[25px] overflow-hidden z-0">
        <Image src={drink.img} alt={drink.name} fill className="object-cover" />
        <div className="absolute top-[10px] left-[10px] flex flex-col gap-[4px] z-10">
          {(drink.temp_type === 'hot_cold' || drink.temp_type === 'hot_only') && (
            <div className="w-[22px] h-[22px] rounded-full bg-[#FFFFFF]/20 backdrop-blur-md border border-[#FFFFFF]/30 flex items-center justify-center shadow-sm">
              <Image src="/icons/fire.svg" alt="Огонь" width={18} height={18} className="object-contain" />
            </div>
          )}
          {(drink.temp_type === 'hot_cold' || drink.temp_type === 'cold_only') && (
            <div className="w-[22px] h-[22px] rounded-full bg-[#FFFFFF]/20 backdrop-blur-md border border-[#FFFFFF]/30 flex items-center justify-center shadow-sm">
              <Image src="/icons/snow.svg" alt="Снежинка" width={18} height={18} className="object-contain" />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[40px] z-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 93%)' }} />
      </div>

      <div className="absolute bottom-[14px] left-[5px] w-[160px] h-[24px] bg-gradient-to-r from-[#FF00EE]/20 to-[#FF008C]/20 backdrop-blur-md border border-[#FFFFFF]/40 box-border rounded-full flex items-center justify-center shadow-[0px_4px_6px_2px_rgba(8,0,255,0.15)] z-10 px-2">
        <span className={`${drink.name.length > 10 ? 'text-[7px]' : 'text-[10px]'} font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-wider leading-none whitespace-nowrap`}>
          {drink.name}
        </span>
      </div>

      <div className="absolute -top-[7px] -right-[4px] w-[73px] h-[64px] z-20 pointer-events-none">
        <Image src="/icons/ribbon.svg" alt="Лента" fill className="object-contain" />
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