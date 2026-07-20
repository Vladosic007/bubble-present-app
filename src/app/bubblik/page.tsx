"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LEVELS } from '../../lib/loyaltyConfig';
import { getCosmetic } from '../../lib/cosmetics';

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
  const router = useRouter();
  const [bubblikName, setBubblikName] = useState('ИМЯ БАБЛИКА');
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [currentDrinks, setCurrentDrinks] = useState(0);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  // ❗ НОВЫЙ СТЕЙТ ДЛЯ ЗАГРУЗКИ ❗
  const [isLoading, setIsLoading] = useState(true);

  // Баблкоины
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; coins: number } | null>(null);
  const [birthdayBonus, setBirthdayBonus] = useState<number | null>(null);
  const [equipped, setEquipped] = useState<{ aura: string; name: string; bg: string; booster: string } | null>(null);

  // 👉 Свайп влево → страница рулетки
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = useState(0); // 0..1 — насколько тянут влево
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Только горизонтальный свайп
    if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
      setSwipeHint(Math.min(1, Math.abs(dx) / 120));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null; touchStartY.current = null;
    setSwipeHint(0);
    // свайп влево > 70px и в основном горизонтальный
    if (dx < -70 && Math.abs(dx) > Math.abs(dy)) {
      router.push('/wheel');
    }
  };

  // Текст подсказки: уровень · диапазон напитков · скидка (из конфига лояльности)
  const levelsInfo = LEVELS.map((l, i) => {
    const max = i < LEVELS.length - 1 ? LEVELS[i + 1].minCups - 1 : null;
    const range = max === null ? `${l.minCups}+` : `${l.minCups}–${max}`;
    const disc = l.discount === 0 ? 'без скидки' : `скидка ${l.discount}%`;
    return `${l.level} ур. · ${range} 🧋 · ${disc}`;
  });
  
  // ❗ ТЯНЕМ ВЫПИТЫЕ НАПИТКИ ИЗ БАЗЫ ❗
  useEffect(() => {
    const savedName = localStorage.getItem('bubblik_custom_name');
    if (savedName) setBubblikName(savedName);

    // 1. МГНОВЕННО показываем баблика из кэша
    try {
      const cachedCups = localStorage.getItem('bubblik_cups_cache');
      if (cachedCups !== null) {
        setCurrentDrinks(Number(cachedCups) || 0);
        setIsLoading(false);
      }
    } catch {}

    // 2. В ФОНЕ считаем свежее число напитков
    const fetchDrinksData = async () => {
      const phone = localStorage.getItem('bubble_user_phone');
      if (!phone) {
        setIsLoading(false); // Если гость, то вырубаем загрузку сразу
        return;
      }

      try {
        const res = await fetch(`/api/bublik?phone=${encodeURIComponent(phone)}`);
        const json = await res.json();
        const totalCups = json.cups || 0;
        setCurrentDrinks(totalCups);
        try { localStorage.setItem('bubblik_cups_cache', String(totalCups)); } catch {}
      } catch {}

      // Баланс баблкоинов + ожидающий левел-ап (заодно выдаётся приветственный бонус)
      try {
        const cRes = await fetch(`/api/coins?phone=${encodeURIComponent(phone)}`);
        const cJson = await cRes.json();
        setCoinBalance(cJson.balance ?? 0);
        if (cJson.pending) setLevelUp(cJson.pending);
        if (cJson.pendingBirthday) setBirthdayBonus(cJson.pendingBirthday);
        if (cJson.equipped) setEquipped(cJson.equipped);
      } catch {}

      setIsLoading(false);
    };

    fetchDrinksData();
  }, []);

  // Закрыть окно левел-апа и погасить pending на сервере
  const claimLevelUp = async () => {
    const phone = localStorage.getItem('bubble_user_phone');
    setLevelUp(null);
    if (phone) {
      fetch('/api/coins/ack-levelup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      }).catch(() => {});
    }
  };

  // Закрыть поздравление с ДР
  const claimBirthday = async () => {
    const phone = localStorage.getItem('bubble_user_phone');
    setBirthdayBonus(null);
    if (phone) {
      fetch('/api/coins/ack-birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      }).catch(() => {});
    }
  };

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

  // Скидка текущего и следующего уровня + сколько напитков до повышения
  const currentDiscount = LEVELS[currentLevelIndex]?.discount ?? 0;
  const nextLevelConf = LEVELS[currentLevelIndex + 1];
  const drinksToNext = currentLevelData.maxDrinks === 999 ? 0 : Math.max(0, currentLevelData.maxDrinks - currentDrinks);

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

  // Применяемая косметика
  const bgCosmetic = getCosmetic(equipped?.bg);
  const customBg = bgCosmetic && bgCosmetic.value !== 'default' ? bgCosmetic.value : null;
  const auraColor = getCosmetic(equipped?.aura)?.value || '#FF008C';
  const nameCosmetic = getCosmetic(equipped?.name);
  const nameColor = nameCosmetic && nameCosmetic.value.startsWith('#') ? nameCosmetic.value : '#FFFFFF';
  const nameIsRainbow = nameCosmetic?.id === 'name_rainbow';

  return (
    <div className="bg-[#110A1A] min-h-[100dvh] w-full flex justify-center overflow-y-auto overflow-x-hidden font-sans relative" style={customBg ? { background: customBg } : undefined}>

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none w-full h-full">
        <Image draggable={false} src="/images/bubblik-bg.jpg" alt="Космический фон" fill className={`object-cover transition-opacity duration-500 ${customBg ? 'opacity-0' : 'opacity-60'}`} priority />
        <div className="animated-cosmic-latte">
          <div className="stars-layer-1" />
          <div className="stars-layer-2" />
          <div className="coffee-nebula" />
        </div>
      </div>

      <main
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: swipeHint > 0 ? `translateX(${-swipeHint * 40}px)` : undefined, transition: swipeHint === 0 ? 'transform 0.25s ease-out' : 'none' }}
        className="w-full max-w-[370px] relative z-10 flex flex-col items-center pb-[120px] min-h-[100dvh] touch-pan-y"
      >

        {/* 🪙 Плашка баблкоинов (слева вверху, пульсирует, ведёт на страницу коинов) */}
        {coinBalance !== null && (
          <motion.button
            onClick={() => router.push('/coins')}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.94 }}
            className="absolute top-[108px] left-[20px] z-50 flex items-center gap-[6px] pl-[6px] pr-[12px] py-[5px] rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_18px_rgba(255,0,140,0.35)]"
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-[26px] h-[26px]"
            >
              <Image draggable={false} src="/images/bablecoin.png" alt="" fill className="object-contain" />
            </motion.div>
            <span className="text-white font-['Benzin'] font-extrabold text-[13px] leading-none">{coinBalance}</span>
          </motion.button>
        )}


        <div className="absolute top-[117px] right-[24px] w-[24px] h-[24px] cursor-pointer z-50 flex items-center justify-center transition-transform active:scale-90"
          onClick={() => setIsInfoOpen(!isInfoOpen)}
        >
          <Image draggable={false} src={isInfoOpen ? "/icons/info-gray.svg" : "/icons/info-white.svg"} alt="Инфо" fill className="object-contain transition-all duration-200" />
        </div>

        {isInfoOpen && (
          <div className="absolute top-[150px] right-[24px] w-[235px] max-h-[270px] bg-[#FFFFFF]/10 backdrop-blur-xl border border-[#FFFFFF]/20 rounded-[15px] z-50 shadow-[0px_4px_15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            <div className="w-full overflow-y-auto no-scrollbar pt-[12px] pb-[14px] px-[14px] flex flex-col gap-[7px]">
              <span className="text-[#FF008C] font-['Benzin'] font-extrabold text-[10px] uppercase tracking-wider mb-[2px]">Уровни и скидки</span>
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
            {/* ❗ БЛОК ИМЕНИ БАБЛИКА С ПОДСКАЗКОЙ ❗ */}
            <div className="relative z-20 mt-[165px] mb-[30px] w-full flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[300px] flex justify-center items-center">
                <input
                  type="text"
                  maxLength={15}
                  value={bubblikName}
                  onChange={handleNameChange}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-transparent text-center outline-none placeholder:text-white/50 uppercase cursor-text z-10"
                  style={{
                    fontFamily: "'Benzin', sans-serif", fontSize: '12px', letterSpacing: '0.02em', fontWeight: 800,
                    ...(nameIsRainbow
                      ? { background: nameCosmetic!.value, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' as any }
                      : { color: nameColor }),
                  }}
                  placeholder="ВВЕДИ ИМЯ"
                />
                {/* ❗ Иконка карандашика ❗ */}
                <div className="absolute right-[30px] pointer-events-none opacity-40 z-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </div>
              </div>
              
              {/* ❗ Текст-подсказка ❗ */}
              <span className="text-[8px] text-white/40 font-['Arial'] font-bold uppercase mt-[6px] tracking-wider drop-shadow-md">
                Нажми, чтобы дать имя
              </span>
            </div>

            <div className="relative z-10 w-[251px] h-[287px] shrink-0 pointer-events-none flex items-center justify-center">
              {/* Аура (косметика) */}
              <div className="absolute inset-[15%] rounded-full z-0" style={{ background: `radial-gradient(circle, ${auraColor}55 0%, transparent 70%)`, filter: 'blur(25px)' }} />
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
                  <Image draggable={false} src={currentLevelData.img} alt="Баблик" fill className="object-contain drop-shadow-[0_0_20px_rgba(255,0,238,0.3)]" priority />
                </motion.div>
              </AnimatePresence>
            </div>

            <span className="mt-[8px] text-white tracking-[0.02em] leading-none z-10 uppercase" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800, fontSize: '12px' }}>
              Level {currentLevelData.level}
            </span>

            {/* Текущая и следующая скидка уровня */}
            <div className="flex flex-col items-center gap-[5px] mt-[10px] z-10">
              <span className="px-[16px] py-[5px] rounded-full bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Benzin'] font-extrabold text-[11px] uppercase shadow-[0_0_16px_rgba(255,0,140,0.45)]">
                {currentDiscount > 0 ? `Твоя скидка ${currentDiscount}%` : 'Пока без скидки'}
              </span>
              {nextLevelConf ? (
                <span className="text-white/65 font-['Arial'] font-bold text-[9px] uppercase tracking-wide">
                  до −{nextLevelConf.discount}% осталось {drinksToNext} 🧋
                </span>
              ) : (
                <span className="text-[#FFD700] font-['Arial'] font-bold text-[9px] uppercase tracking-wide">🔥 Максимальная скидка!</span>
              )}
            </div>

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

        {/* 🎉 ОКНО ЛЕВЕЛ-АПА */}
        <AnimatePresence>
          {levelUp && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-[30px]"
              onClick={claimLevelUp}
            >
              <motion.div
                initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[300px] bg-gradient-to-b from-[#2A1535] to-[#160A22] border border-[#FF008C]/40 rounded-[28px] p-[26px] flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,0,140,0.5)]"
              >
                <span className="text-[#FFD700] font-['Benzin'] font-extrabold text-[12px] uppercase tracking-wider">✨ Новый уровень! ✨</span>
                <span className="text-white font-['Benzin'] font-extrabold text-[20px] uppercase mt-[6px] leading-tight">Баблик дорос<br/>до Lvl {levelUp.level}</span>
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                  className="relative w-[90px] h-[90px] my-[16px] drop-shadow-[0_0_25px_rgba(255,0,140,0.6)]"
                >
                  <Image draggable={false} src="/images/bablecoin.png" alt="" fill className="object-contain" />
                </motion.div>
                <span className="text-[#14FF00] font-['Benzin'] font-extrabold text-[26px] leading-none">+{levelUp.coins}</span>
                <span className="text-white/70 font-['Arial'] font-bold text-[11px] uppercase mt-[2px]">баблкоинов</span>
                <button
                  onClick={claimLevelUp}
                  className="w-full h-[48px] mt-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[13px] uppercase active:scale-95 transition-transform"
                >
                  Забрать 🎁
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎂 ОКНО ДНЯ РОЖДЕНИЯ */}
        <AnimatePresence>
          {birthdayBonus && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-[30px]"
              onClick={claimBirthday}
            >
              <motion.div
                initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[300px] bg-gradient-to-b from-[#2A1535] to-[#160A22] border border-[#FF008C]/40 rounded-[28px] p-[26px] flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,0,140,0.5)]"
              >
                <span className="text-[38px]">🎂</span>
                <span className="text-white font-['Benzin'] font-extrabold text-[18px] uppercase mt-[8px] leading-tight">С Днём Рождения!</span>
                <span className="text-white/70 font-['Arial'] font-bold text-[11px] mt-[6px]">Лови подарок от Bubble Present 🎉</span>
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                  className="relative w-[90px] h-[90px] my-[16px] drop-shadow-[0_0_25px_rgba(255,0,140,0.6)]"
                >
                  <Image draggable={false} src="/images/bablecoin.png" alt="" fill className="object-contain" />
                </motion.div>
                <span className="text-[#14FF00] font-['Benzin'] font-extrabold text-[26px] leading-none">+{birthdayBonus}</span>
                <span className="text-white/70 font-['Arial'] font-bold text-[11px] uppercase mt-[2px]">баблкоинов</span>
                <button
                  onClick={claimBirthday}
                  className="w-full h-[48px] mt-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[13px] uppercase active:scale-95 transition-transform"
                >
                  Ура, спасибо! 🥳
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}