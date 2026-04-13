"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt'; 

export default function Home() {
  // Стейт для аватарки
  const [avatar, setAvatar] = useState('/images/avatar1.jpg');

  // Достаем фотку из памяти при загрузке страницы
  useEffect(() => {
    const savedPhoto = localStorage.getItem('bubble_user_photo');
    if (savedPhoto) {
      setAvatar(savedPhoto);
    }
  }, []);

  const categories = [
    { title: 'Бабл ти', img: '/images/bablti.jpg', href: '/menu/tea' },
    { title: 'Бабл кофе', img: '/images/bablcofe.jpg', href: '/menu/coffee' },
    { title: 'Бабл лим', img: '/images/babllim.jpg', href: '/menu/lim' },
    { title: 'Бабл матча', img: '/images/bablmatcha.jpg', href: '/menu/matcha' },
  ];

  return (
    <div className="p-4 flex flex-col items-center pb-[180px] pt-8 min-h-screen bg-[#FAFAFA]">
      
      {/* ❗ ВСТАВЛЯЕМ ПЛАШКУ СЮДА ❗ */}
      <InstallPrompt />

      {/* 1. ШАПКА: ЛОГОТИП + АВАТАРКА */}
      <div className="w-full max-w-[370px] flex items-center justify-between mb-[32px] relative h-[40px]">
        {/* Пустой блок слева для симметрии */}
        <div className="w-[34px]"></div>

        {/* Логотип строго по центру */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center pointer-events-none">
          <Image 
            src="/images/logo.jpg" 
            alt="Bubble Present" 
            width={160} 
            height={45} 
            className="object-contain"
            priority
          />
        </div>

        {/* Аватарка справа */}
        <Link href="/profile" className="w-[34px] h-[34px] rounded-full overflow-hidden shadow-sm active:scale-90 transition-transform duration-300 bg-[#E5E5EA] z-10">
          <Image 
            src={avatar} 
            alt="Профиль" 
            width={34} 
            height={34} 
            className="object-cover w-full h-full"
            unoptimized // Важно для самодельных фоток (base64)
          />
        </Link>
      </div>

      {/* 2. КАРТОЧКИ КАТЕГОРИЙ */}
      <div className="flex flex-col gap-[32px] w-full items-center">
        {categories.map((cat) => (
          <Link
            key={cat.title}
            href={cat.href}
            className="relative w-full max-w-[370px] h-[314px] rounded-[25px] overflow-hidden shadow-[0px_5px_5.7px_4px_rgba(255,0,140,0.25)] active:scale-95 transition-all duration-300 ease-out shrink-0"
          >
            <Image
              src={cat.img}
              alt={cat.title}
              fill
              className="object-cover"
              priority 
            />

            <div className="absolute top-[16px] left-[16px] w-[178px] h-[44px] flex items-center justify-start z-10">
              <h2 className="text-[22px] whitespace-nowrap leading-none font-extrabold bg-gradient-to-br from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase tracking-[2px]">
                {cat.title}
              </h2>
            </div>

            <div className="absolute bottom-[12px] right-[12px] w-[20px] h-[20px] bg-white/30 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center shadow-sm z-10 box-border">
              <div 
                className="w-[8px] h-[6px] bg-[#33363F] opacity-100" 
                style={{ 
                  WebkitMaskImage: "url('/icons/arrow-right.svg')", 
                  WebkitMaskSize: "contain", 
                  WebkitMaskRepeat: "no-repeat", 
                  WebkitMaskPosition: "center",
                  maskImage: "url('/icons/arrow-right.svg')",
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center"
                }} 
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}