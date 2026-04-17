"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // ❗ ПОДКЛЮЧИЛИ АНИМАЦИИ ДЛЯ МОДАЛКИ ❗

export default function ProfilePage() {
  const [userName, setUserName] = useState("Гость");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("/images/avatar.jpg"); 
  
  const [isInfoPressed, setIsInfoPressed] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // ❗ СТЕЙТ ДЛЯ ОКНА ПОДДЕРЖКИ ❗
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('bubble_user_name');
    const savedPhone = localStorage.getItem('bubble_user_phone');
    const savedAddress = localStorage.getItem('bubble_user_address');
    const savedPhoto = localStorage.getItem('bubble_user_photo');

    if (savedName) setUserName(savedName);
    if (savedPhone) setPhone(savedPhone);
    if (savedAddress) setAddress(savedAddress);
    if (savedPhoto) setPhotoUrl(savedPhoto);
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('bubble_user_name', userName);
    localStorage.setItem('bubble_user_phone', phone);
    localStorage.setItem('bubble_user_address', address);
    localStorage.setItem('bubble_user_photo', photoUrl);
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoUrl(base64String); 
        localStorage.setItem('bubble_user_photo', base64String); 
      };
      reader.readAsDataURL(file);
    }
  };

  // ❗ ПРОКАЧАЛИ КНОПКУ МЕНЮ (чтобы она могла быть как ссылкой, так и просто кнопкой) ❗
  const ProfileMenuButton = ({ title, href, onClick }: { title: string, href?: string, onClick?: () => void }) => {
    const content = (
      <div 
        className="relative w-full h-[52px] rounded-[25px] bg-[#FFFFFF]/20 backdrop-blur-[30px] flex items-center justify-between shrink-0 box-border"
        style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(8, 0, 255, 0.25)' }}
      >
        <span className="ml-[16px] font-['Benzin'] font-extrabold text-[16px] tracking-[0.02em] uppercase bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text drop-shadow-[0_0_1px_rgba(255,255,255,0.5)]">
          {title}
        </span>
        <div 
          className="mr-[12px] w-[24px] h-[24px] rounded-[25px] bg-[#FFFFFF]/20 backdrop-blur-[30px] flex items-center justify-center shrink-0"
          style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 2px 5.7px 4px rgba(8, 0, 255, 0.25)' }}
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L1 9" stroke="#FF00EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );

    return href ? (
      <Link href={href} className="block w-[346px] mx-auto active:scale-95 transition-transform">
        {content}
      </Link>
    ) : (
      <button onClick={onClick} className="block w-[346px] mx-auto active:scale-95 transition-transform appearance-none outline-none">
        {content}
      </button>
    );
  };

  return (
    <div className="bg-[#FDFDFD] min-h-[100dvh] w-full flex justify-center overflow-y-auto overflow-x-hidden font-sans relative">
      <main className="w-full max-w-[370px] relative bg-[#FFFFFF] flex flex-col items-center pb-[120px] min-h-[100dvh]">
        
        <button 
          className="absolute top-[40px] right-[20px] z-[100] transition-opacity duration-200 active:scale-90"
          onTouchStart={() => setIsInfoPressed(true)}
          onTouchEnd={() => setIsInfoPressed(false)}
          onClick={() => alert('Bubble Present v1.0\nТвой любимый Бабл-Ти сервис')}
        >
          <Image 
            src={isInfoPressed ? "/icons/info-gray.svg" : "/icons/info-white.svg"} 
            alt="Инфо" 
            width={24} height={24} 
            className="object-contain" 
          />
        </button>

        {/* 1. БЛОК АВАТАРКИ С ИКОНКОЙ КАМЕРЫ */}
        <div className="mt-[100px] relative w-[180px] h-[180px] shrink-0 z-10">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full h-full rounded-full overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.15)] border-4 border-white bg-[#E5E5EA] cursor-pointer group"
          >
            <Image 
              src={photoUrl} 
              alt="Аватар" 
              fill 
              className="object-cover transition-opacity duration-300 group-hover:opacity-70" 
              priority
              quality={100} 
              unoptimized 
            />
            {/* Затемнение работает только на компах */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
               <span className="text-white font-['Benzin'] text-[12px] uppercase drop-shadow-md">Изменить</span>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          {/* ❗ ПОДСКАЗКА: ИКОНКА КАМЕРЫ ❗ */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-[5px] right-[10px] w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.15)] cursor-pointer active:scale-90 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF008C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>
        </div>

        {/* 2. БЛОК ИМЕНИ С ИКОНКОЙ КАРАНДАША */}
        <div className="mt-[20px] px-4 w-full flex flex-col items-center justify-center z-10 relative">
          <div className="relative w-full flex justify-center items-center">
            <input 
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={handleSaveProfile}
              maxLength={20}
              placeholder="ТВОЕ ИМЯ"
              className="font-['Benzin'] font-extrabold text-[32px] tracking-[0.02em] uppercase text-center w-full bg-transparent outline-none focus:ring-0 leading-tight cursor-text"
              style={{ 
                backgroundImage: 'linear-gradient(to right, #FF00EE, #FF008C)',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                filter: 'drop-shadow(0px 0px 1px rgba(255,255,255,0.5))'
              }}
            />
            {/* ❗ ПОДСКАЗКА: ИКОНКА КАРАНДАША ❗ */}
            <div className="absolute right-[20px] pointer-events-none opacity-40">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF008C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </div>
          </div>
          
          {/* ❗ ПОДСКАЗКА: ТЕКСТ ❗ */}
          <span className="text-[10px] text-[#949494] font-['Arial'] font-bold uppercase mt-[4px]">
            Нажми, чтобы изменить имя
          </span>
        </div>

        <section className="mt-[40px] w-full flex flex-col items-center gap-[32px] px-[12px] pb-[40px] z-10">
          <ProfileMenuButton title="История заказов" href="/profile/history" />
          <ProfileMenuButton title="Сведения" href="/profile/info" />
          
          {/* ❗ КНОПКА ПОДДЕРЖКИ ТЕПЕРЬ ОТКРЫВАЕТ МОДАЛКУ ❗ */}
          <ProfileMenuButton title="Поддержка" onClick={() => setIsSupportOpen(true)} />
        </section>

      </main>

      {/* ❗❗❗ ВСПЛЫВАЮЩЕЕ ОКНО ПОДДЕРЖКИ ❗❗❗ */}
      <AnimatePresence>
        {isSupportOpen && (
          <>
            {/* Затемнение фона */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
            />
            
            {/* Сама модалка */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-[#FFFFFF] rounded-t-[30px] z-[200] flex flex-col items-center pt-[16px] px-[24px] pb-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="w-[40px] h-[5px] bg-[#E5E5EA] rounded-full mb-[24px]" />
              
              <h2 className="text-[24px] font-['Benzin'] font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase text-center leading-none mb-[32px]">
                Поддержка
              </h2>

              {/* ❗ ВСТАВЬ СВОЙ ТЕЛЕГРАМ НИЖЕ ❗ */}
              <a 
                href="https://t.me/BubblePresentSupport" 
                target="_blank" 
                rel="noreferrer" 
                className="w-[346px] h-[52px] rounded-[20px] bg-[#0088CC]/10 text-[#0088CC] border border-[#0088CC]/30 font-['Arial'] font-bold uppercase text-[14px] active:scale-95 transition-transform flex items-center justify-center gap-2 mb-[16px]"
              >
                <span className="text-[20px]">💬</span> Написать в Telegram
              </a>

              {/* ❗ ВСТАВЬ СВОЙ НОМЕР НИЖЕ ❗ */}
              <a 
                href="tel:+79281265120" 
                className="w-[346px] h-[52px] rounded-[20px] bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30 font-['Arial'] font-bold uppercase text-[14px] active:scale-95 transition-transform flex items-center justify-center gap-2 mb-[24px]"
              >
                <span className="text-[20px]">📞</span> Позвонить баристе
              </a>

              <button 
                onClick={() => setIsSupportOpen(false)} 
                className="w-[346px] h-[52px] rounded-[20px] bg-[#F2F2F7] text-[#949494] font-['Arial'] font-bold uppercase text-[12px] active:scale-95 transition-transform"
              >
                Закрыть
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
    </div>
  );
}