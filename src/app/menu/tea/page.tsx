"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../../store/cartStore'; 
import { supabase } from '../../../lib/supabase';

// ❗ ЕДИНЫЙ СЛОВАРЬ (все маленькими буквами для Linux/Vercel) ❗
const slugMap: Record<string, string> = {
  'нутелла': 'nutella1',
  'орео': 'oreo1', 
  'бабл милк ти': 'bubble-milk1',
  'молочная черника': 'blueberry',
  'тайское караоке': 'caraoke',
  'гранат кокос': 'pomegranate1',
  'чоко клубника': 'choco-straw',
  'таро': 'taro1',
  'жасминовая клубника': 'jasmine-straw1',
  'морозная черника': 'frost-blueberry',
  'малиновое облако': 'rasp-cloud1',
  'красная смородина': 'red-currant1',
  'цитрус': 'citrus',
  'жасминовая малина': 'jasmine-rasp1',
  'маракуйя с содовой': 'passion-soda1',
  'жасминовый лайм': 'jasmine-lime',
  'рэд драгон': 'red-dragon1',
  'тай лун': 'tai-lung1',
  'облепиховая пряность': 'sea-buckthorn1',
  'жасминовый киви': 'jasmine-kiwi',
  'лесной морс': 'forest-berries',
  'тайский с апельсином': 'thai-orange1',
  'ягодный микс': 'berry-mix',
  'вельвет': 'velvet1',
  'вильвет': 'velvet1'
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
  const [drinks, setDrinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем аватарку
  useEffect(() => {
    const savedPhoto = localStorage.getItem('bubble_user_photo');
    if (savedPhoto) setAvatar(savedPhoto);
  }, []);

  // Оптимизированный запрос к базе
  useEffect(() => {
    async function fetchDrinks() {
      try {
        const { data, error } = await supabase
          .from('drinks')
          .select('name, price_pickup, price_delivery, category, subcategory, temp_type, is_active')
          .eq('category', 'Бабл милк ти')
          .eq('is_active', true);

        if (error) throw error;
        if (data) setDrinks(data);
      } catch (err) {
        console.error("Ошибка загрузки меню:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDrinks();
  }, []);

  // Группировка напитков (чтобы не тормозило при скролле)
  const groupedDrinks = useMemo(() => {
    const groups: Record<string, any[]> = { milk: [], sweeter: [], sour: [], 'with-sour': [] };
    
    drinks.forEach(d => {
      const normalizedName = d.name.toLowerCase().trim();
      const slug = slugMap[normalizedName] || 'default-slug';
      const drinkObj = {
        id: slug,
        name: normalizedName === 'вильвет' ? 'Вельвет' : d.name,
        pickupPrice: d.price_pickup,
        deliveryPrice: d.price_delivery,
        img: `/images/${slug}.jpg`,
        href: `/menu/tea/${slug}`,
        temp_type: d.temp_type
      };

      if (d.subcategory === 'Молочные') groups.milk.push(drinkObj);
      else if (d.subcategory === 'Послаще') groups.sweeter.push(drinkObj);
      else if (d.subcategory === 'Покислее') groups.sour.push(drinkObj);
      else if (d.subcategory === 'С кислинкой') groups['with-sour'].push(drinkObj);
    });
    return groups;
  }, [drinks]);

  const scrollToCategory = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 140;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col items-center pb-[120px] bg-[#FAFAFA] min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="sticky top-0 z-50 w-full bg-[#FAFAFA]/80 backdrop-blur-md border-b border-black/5 pt-6 pb-4 px-4">
        <div className="w-full max-w-[370px] mx-auto flex items-center justify-between mb-4 relative h-[40px]">
           <div className="w-[34px]" />
           <Link href="/" className="absolute left-1/2 -translate-x-1/2 active:scale-95 transition-transform">
              <Image src="/images/logo.jpg" alt="Logo" width={140} height={40} priority className="object-contain" />
           </Link>
           <Link href="/profile" className="w-[34px] h-[34px] rounded-full overflow-hidden border border-black/5">
              <Image src={avatar} alt="User" width={34} height={34} className="object-cover" unoptimized />
           </Link>
        </div>

        {/* SWITCHER */}
        <div className="w-full max-w-[346px] mx-auto h-[40px] bg-[#E5E5EA] rounded-full p-[3px] flex relative mb-4">
          <motion.div
            className="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-white rounded-full shadow-sm"
            animate={{ left: orderType === 'pickup' ? '3px' : '50%' }}
          />
          <button onClick={() => setOrderType('pickup')} className={`flex-1 z-10 font-['Benzin'] text-[9px] font-bold uppercase transition-colors ${orderType === 'pickup' ? 'text-[#FF008C]' : 'text-[#8E8E93]'}`}>Самовывоз</button>
          <button onClick={() => setOrderType('delivery')} className={`flex-1 z-10 font-['Benzin'] text-[9px] font-bold uppercase transition-colors ${orderType === 'delivery' ? 'text-[#FF008C]' : 'text-[#8E8E93]'}`}>Доставка</button>
        </div>

        {/* CATEGORIES */}
        <div className="w-full max-w-[370px] mx-auto flex gap-2 overflow-x-auto no-scrollbar py-1">
          {menuCategories.map((cat) => (
            <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-black text-white shadow-lg' : 'bg-[#D6D6D8] text-[#7A7A7A]'}`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full max-w-[370px] px-4 mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center mt-20 opacity-50">
            <div className="w-10 h-10 border-4 border-[#FF008C] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-['Benzin'] text-[10px] uppercase">Загружаем меню...</p>
          </div>
        ) : (
          Object.entries(groupedDrinks).map(([id, items]) => items.length > 0 && (
            <section key={id} id={id} className="mb-12">
              <h2 className="text-[24px] font-['Benzin'] font-bold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase mb-6">
                {menuCategories.find(c => c.id === id)?.label}
              </h2>
              <div className="grid grid-cols-2 gap-x-5 gap-y-8">
                {items.map((drink) => <DrinkCard key={drink.id} drink={drink} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function DrinkCard({ drink }: { drink: any }) {
  const { orderType } = useCartStore();
  const price = orderType === 'delivery' ? drink.deliveryPrice : drink.pickupPrice;

  return (
    <Link href={drink.href} className="relative group active:scale-95 transition-transform">
      <div className="w-full aspect-[170/162] rounded-[25px] overflow-hidden relative shadow-md">
        <Image 
          src={drink.img} 
          alt={drink.name} 
          fill 
          sizes="170px"
          className="object-cover group-hover:scale-110 transition-transform duration-500" 
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {['hot_cold', 'hot_only'].includes(drink.temp_type) && <StatusIcon icon="/icons/fire.svg" />}
          {['hot_cold', 'cold_only'].includes(drink.temp_type) && <StatusIcon icon="/icons/snow.svg" />}
        </div>
      </div>

      <div className="mt-[-12px] relative z-10 w-[90%] mx-auto bg-white/80 backdrop-blur-md border border-white/40 rounded-full py-1.5 px-2 shadow-lg text-center">
        <span className="text-[9px] font-['Benzin'] font-bold text-[#FF008C] uppercase truncate block">
          {drink.name}
        </span>
      </div>

      <div className="mt-2 text-center">
        <span className="text-[11px] font-['Benzin'] font-bold text-black opacity-40">ОТ {price} ₽</span>
      </div>
    </Link>
  );
}

function StatusIcon({ icon }: { icon: string }) {
  return (
    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
      <Image src={icon} alt="icon" width={14} height={14} />
    </div>
  );
}