"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [device, setDevice] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Проверяем, запускали ли мы уже приложение как PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);
    
    // Проверяем, скрывал ли юзер эту плашку ранее
    const isDismissed = localStorage.getItem('bubble_pwa_dismissed');

    if (isStandalone || isDismissed) {
      return; // Если уже установлено или скрыто - ничего не делаем
    }

    // Определяем устройство
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) setDevice('ios');
    else if (isAndroid) setDevice('android');

    // Если это телефон, показываем плашку через 3 секунды
    if (isIOS || isAndroid) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('bubble_pwa_dismissed', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none pb-[20px] px-[16px] font-sans">
          {/* Темный фон */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={handleDismiss}
          />

          {/* Сама плашка */}
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[370px] bg-white rounded-[30px] p-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pointer-events-auto flex flex-col items-center text-center"
          >
            <div className="w-[50px] h-[5px] bg-[#E5E5EA] rounded-full mb-[20px]" />
            
            <div className="w-[60px] h-[60px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-[18px] flex items-center justify-center shadow-[0_4px_15px_rgba(255,0,140,0.4)] mb-[16px]">
              <span className="text-[30px] text-white">🧋</span>
            </div>

            <h2 className="text-[18px] font-['Benzin'] font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase leading-tight mb-[12px]">
              Добавь нас на экран!
            </h2>
            
            <p className="text-[12px] text-[#616161] font-['Arial'] font-bold leading-relaxed mb-[24px]">
              Установи Bubble Present как приложение, чтобы заказывать любимый бабл-ти в один клик.
            </p>

            <div className="w-full bg-[#F2F2F7] rounded-[20px] p-[16px] mb-[24px] flex flex-col gap-[12px]">
              {device === 'ios' ? (
                <>
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[30px] h-[30px] bg-white rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-[16px]">1</span>
                    </div>
                    <span className="text-[11px] font-['Arial'] font-bold text-[#333] text-left uppercase">
                      Нажми кнопку «Три точки» внизу экрана
                    </span>
                  </div>
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[30px] h-[30px] bg-white rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-[16px]">2</span>
                    </div>
                    <span className="text-[11px] font-['Arial'] font-bold text-[#333] text-left uppercase">
                      Выбери поделиться
                    </span>
                  </div>
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[30px] h-[30px] bg-white rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-[16px]">3</span>
                    </div>
                    <span className="text-[11px] font-['Arial'] font-bold text-[#333] text-left uppercase">
                      Выбери пункт «На экран "Домой"» ➕
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[30px] h-[30px] bg-white rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-[16px]">1</span>
                    </div>
                    <span className="text-[11px] font-['Arial'] font-bold text-[#333] text-left uppercase">
                      Нажми на три точки (меню браузера) вверху экрана
                    </span>
                  </div>
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[30px] h-[30px] bg-white rounded-[10px] flex items-center justify-center shadow-sm shrink-0">
                      <span className="text-[16px]">2</span>
                    </div>
                    <span className="text-[11px] font-['Arial'] font-bold text-[#333] text-left uppercase">
                      Выбери «Установить приложение» или «На главный экран» 📱
                    </span>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={handleDismiss}
              className="w-full h-[52px] rounded-[20px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform shadow-[0_4px_15px_rgba(255,0,140,0.3)]"
            >
              Понятно, скрыть
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}