"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase'; // ❗ Твой путь до supabase

// === МАССИВ УРОВНЕЙ С ТОЧНЫМИ МАКСИМУМАМИ ===
const BUBBLIK_LEVELS = [
  { level: 1, maxDrinks: 10, img: '/images/bubblik-1.png', desc: 'Ваш баблик ещё даже не догадывается про\nсуществование культуры бабл-напитков' },
  { level: 2, maxDrinks: 21, img: '/images/bubblik-2.png', desc: 'Баблик попробовал первый напиток и\nтеперь жаждет больше тапиоки!' },
  { level: 3, maxDrinks: 32, img: '/images/bubblik-3.png', desc: 'Он уверенно заказывает джус-боллы\nи знает меню наизусть.' },
  { level: 4, maxDrinks: 54, img: '/images/bubblik-4.png', desc: 'Тапиока течет по его венам.\nОн стал настоящим экспертом.' },
  { level: 5, maxDrinks: 65, img: '/images/bubblik-5.png', desc: 'Бариста узнает его по шагам.\nУважение на максималках.' },
  { level: 6, maxDrinks: 76, img: '/images/bubblik-6.png', desc: 'Его рецепторы способны отличить\nМатчу от Сырного рафа с закрытыми глазами.' },
  { level: 7, maxDrinks: 98, img: '/images/bubblik-7.png', desc: 'Император чая. Говорят, он может\nсоздавать напитки силой мысли.' },
  { level: 8, maxDrinks: 999, img: '/images/bubblik-8.png', desc: 'БОГ БАБЛ-ТИ.\nЛегенда при жизни.' }
];

export default function BubblikPage() {
  const [bubblikName, setBubblikName] = useState('ИМЯ БАБЛИКА');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const [currentDrinks, setCurrentDrinks] = useState(0); 
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  
  // ❗ НОВЫЙ СТЕЙТ ДЛЯ ЗАГРУЗКИ ❗
  const [isLoading, setIsLoading] = useState(true);

  const levelsInfo = [
    "1 уровень - 0-10 напитков",
    "2 уровень - 11-21 заказов",
    "3 уровень - 22-32 заказов",
    "4 уровень - 33-54 заказов",
    "5 уровень - 55-65 заказов",
    "6 уровень - 66-76 заказов",
    "7 уровень - 77-98 заказов",
    "8 уровень - 99+ заказов"
  ];
  
  // ❗ ТЯНЕМ ВЫПИТЫЕ НАПИТКИ ИЗ БАЗЫ ❗
  useEffect(() => {
    const savedName = localStorage.getItem('bubblik_custom_name');
    if (savedName) setBubblikName(savedName);

    const fetchDrinksData = async () => {
      const phone = localStorage.getItem('bubble_user_phone');
      if (!phone) {
        setIsLoading(false); // Если гость, то вырубаем загрузку сразу
        return; 
      }

      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .eq('phone', phone)
        .eq('status', 'completed');

      if (data && !error) {
        let totalCups = 0;
        data.forEach(order => {
          try {
            const parsedItems = JSON.parse(order.items);
            parsedItems.forEach((item: any) => {
              totalCups += item.qty;
            });
          } catch(e) {}
        });
        setCurrentDrinks(totalCups);
      }
      
      // Выключаем загрузку ТОЛЬКО когда всё посчитали
      setIsLoading(false);
    };

    fetchDrinksData();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setBubblikName(newName);
    localStorage.setItem('bubblik_custom_name', newName);
  };
  
  // 1. УМНАЯ СИСТЕМА ОПРЕДЕЛЕНИЯ УРОВНЯ
  let currentLevelIndex = 0;
  for (let i = 0; i < BUBBLIK_LEVELS.length - 1; i++) {
    if (currentDrinks >= BUBBLIK_LEVELS[i].maxDrinks) {
      currentLevelIndex = i + 1;
    } else {
      break;
    }
  }
  
  const currentLevelData = BUBBLIK_LEVELS[currentLevelIndex];
  const prevMax = currentLevelIndex === 0 ? 0 : BUBBLIK_LEVELS[currentLevelIndex - 1].maxDrinks;
  
  // 2. ИДЕАЛЬНАЯ МАТЕМАТИКА ПОЛОСКИ
  const range = currentLevelData.maxDrinks - prevMax;
  const currentProgressInLevel = currentDrinks - prevMax;
  const progressPercentage = range > 0 ? Math.min(Math.max((currentProgressInLevel / range) * 100, 0), 100) : 100;

  // 3. ЗАЩИТА ОТ СЛИПАНИЯ ЦИФР
  const isOverlapping = progressPercentage > 75;

  const handleAddDrink = () => {
    const newDrinks = currentDrinks + 2; 
    
    let nextLevelIndex = 0;
    for (let i = 0; i < BUBBLIK_LEVELS.length - 1; i++) {
      if (newDrinks >= BUBBLIK_LEVELS[i].maxDrinks) nextLevelIndex = i + 1;
      else break;
    }

    if (nextLevelIndex > currentLevelIndex && currentLevelData.level < 8) {
      setIsLevelingUp(true); 
      setTimeout(() => {
        setCurrentDrinks(newDrinks); 
        setIsLevelingUp(false);
      }, 600);
    } else {
      setCurrentDrinks(newDrinks);
    }
  };

  return (
    <div className="bg-[#110A1A] min-h-[100dvh] w-full flex justify-center overflow-y-auto overflow-x-hidden font-sans relative">
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none w-full h-full">
        <Image src="/images/bubblik-bg.jpg" alt="Космический фон" fill className="object-cover opacity-60" priority />
        <div className="animated-cosmic-latte">
          <div className="stars-layer-1" />
          <div className="stars-layer-2" />
          <div className="coffee-nebula" />
        </div>
      </div>

      <main className="w-full max-w-[370px] relative z-10 flex flex-col items-center pb-[120px] min-h-[100dvh]">
        
        <div className="absolute top-[117px] right-[24px] w-[24px] h-[24px] cursor-pointer z-50 flex items-center justify-center transition-transform active:scale-90"
          onClick={() => setIsInfoOpen(!isInfoOpen)}
        >
          <Image src={isInfoOpen ? "/icons/info-gray.svg" : "/icons/info-white.svg"} alt="Инфо" fill className="object-contain transition-all duration-200" />
        </div>

        {isInfoOpen && (
          <div className="absolute top-[150px] right-[24px] w-[220px] h-[160px] bg-[#FFFFFF]/10 backdrop-blur-xl border border-[#FFFFFF]/20 rounded-[15px] z-50 shadow-[0px_4px_15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            <div className="w-full h-full overflow-y-auto no-scrollbar pt-[12px] pb-[16px] px-[12px] flex flex-col gap-[8px]">
              {levelsInfo.map((text, index) => (
                <span key={index} className="text-white whitespace-nowrap" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '10px' }}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ❗ ЕСЛИ ЗАГРУЗКА - ПОКАЗЫВАЕМ ПУЛЬСИРУЮЩИЙ ТЕКСТ ❗ */}
        {isLoading ? (
          <div className="mt-[250px] flex flex-col items-center justify-center">
            <span className="text-[#FF008C] font-['Benzin'] animate-pulse text-[14px] uppercase tracking-wider drop-shadow-md">
              Баблик просыпается...
            </span>
          </div>
        ) : (
          <>
            <input
              type="text"
              maxLength={15}
              value={bubblikName}
              onChange={handleNameChange}
              onFocus={(e) => e.target.select()}
              className="relative z-20 mt-[165px] mb-[40px] w-full max-w-[300px] bg-transparent text-center text-white outline-none placeholder:text-white/50 uppercase cursor-text"
              style={{ fontFamily: "'Benzin', sans-serif", fontSize: '12px', letterSpacing: '0.02em', fontWeight: 800 }}
              placeholder="ВВЕДИ ИМЯ"
            />

            <div className="relative z-10 w-[251px] h-[287px] shrink-0 pointer-events-none flex items-center justify-center">
              <AnimatePresence>
                {isLevelingUp && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1.5 }} exit={{ opacity: 0, scale: 2 }} transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-full blur-[40px] z-0 opacity-80"
                  />
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentLevelData.level}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="absolute inset-0 w-full h-full z-10"
                >
                  <Image src={currentLevelData.img} alt="Баблик" fill className="object-contain drop-shadow-[0_0_20px_rgba(255,0,238,0.3)]" priority />
                </motion.div>
              </AnimatePresence>
            </div>

            <span className="mt-[8px] text-white tracking-[0.02em] leading-none z-10 uppercase" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800, fontSize: '12px' }}>
              Level {currentLevelData.level}
            </span>

            <div className="relative w-[172px] h-[20px] mt-[16px] mb-[51px] shrink-0 z-10">
              
              <div className="absolute inset-0 rounded-[25px] bg-[#FFFFFF]/20 box-border overflow-hidden"
                style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
              >
                <div 
                  className="absolute left-0 top-0 h-full rounded-[25px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] burning-bar"
                  style={{ width: `${progressPercentage}%`, transition: 'width 0.4s ease-out' }}
                />
              </div>

              <span 
                className="absolute text-white leading-none transition-all duration-300 ease-out z-20"
                style={{ 
                  fontFamily: "'Benzin', sans-serif", fontWeight: 800, fontSize: '10px', 
                  left: `${progressPercentage}%`, transform: 'translateX(-50%)',
                  top: isOverlapping ? '-18px' : '28px' 
                }}
              >
                {currentDrinks}
              </span>
              
              <span className="absolute top-[28px] right-0 text-white leading-none transform translate-x-1/2 z-20"
                style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800, fontSize: '10px' }}
              >
                {currentLevelData.maxDrinks === 999 ? '99+' : currentLevelData.maxDrinks}
              </span>
            </div>

            <div className="w-[350px] mx-[10px] h-[92px] rounded-[25px] bg-[#FFFFFF]/20 box-border flex items-center justify-center text-center shrink-0 z-10 px-[10px]" 
              style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
            >
              <p className="text-[10px] text-white leading-[1.4] tracking-[0.05em] font-benzin font-medium">
                {currentLevelData.desc.split('\n').map((line, i, arr) => (
                  <span key={i}>{line}{i !== arr.length - 1 && <br />}</span>
                ))}
              </p>
            </div>
          </>
        )}

      </main>
    </div>
  );
}