'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Проверяем, на странице ли мы баблика
  const isBubblikPage = pathname === '/bubblik';

  // ВНИМАНИЕ: Проверь, чтобы названия файлов тут тооооочно совпадали с файлами в папке icons!
  const navItems = [
    // ДОМ: если работает наоборот, просто поменяй местами thin и thick тут
    { name: 'Дом', href: '/', iconThin: '/icons/home-thick.svg', iconThick: '/icons/home-thin.svg' },
    
    // БАБЛИК: мы его ВООБЩЕ не трогаем, поэтому пишем одну и ту же иконку в оба места
    { name: 'Баблик', href: '/bubblik', iconThin: '/icons/bablik.svg', iconThick: '/icons/bablik.svg' },
    
    // КОРЗИНА: проверь, точно ли файлы называются cart-thin.svg и cart-thick.svg (из-за этого у тебя разорванная иконка на скрине)
    { name: 'Корзина', href: '/cart', iconThin: '/icons/Bag-thick.svg', iconThick: '/icons/Bag-thin.svg' },
  ];

  // Определяем активный индекс (0 - Дом, 1 - Баблик, 2 - Корзина)
  const activeIndex = navItems.findIndex(item => item.href === pathname) === -1 
    ? 0 
    : navItems.findIndex(item => item.href === pathname);

  return (
    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50">
      
      {/* Главный контейнер меню: ширина 211px, высота 39px */}
      <nav className="relative w-[211px] h-[39px] bg-[#6C6C6C]/20 backdrop-blur-xl rounded-full border border-[#FFFFFF]/40 shadow-[0px_4px_6px_2px_rgba(45,45,45,0.15)] flex items-center px-[4px] overflow-hidden">
        
        {/* === АНИМИРОВАННЫЙ "ЖИДКИЙ" ПРЯМОУГОЛЬНИК === */}
        <div 
          className="absolute h-[31px] w-[64px] bg-[#FFFFFF]/20 backdrop-blur-md border border-[#FFFFFF]/40 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
          style={{
            left: `${4 + (activeIndex * 67)}px`
          }}
        />

        {/* === САМИ КНОПКИ === */}
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          
          // ❗ ВОТ ОНА, УМНАЯ ПРОВЕРКА ❗
          // Красим в белый ТОЛЬКО если мы на странице Баблика И это НЕ иконка Баблика
          const shouldInvert = isBubblikPage && item.name !== 'Баблик';

          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className="relative w-[67px] h-full flex justify-center items-center z-10"
            >
              <div className="relative w-5 h-5 transition-transform duration-300 active:scale-75">
                <Image
                  src={isActive ? item.iconThick : item.iconThin}
                  alt={item.name}
                  fill
                  // Применяем инверсию только если shouldInvert = true
                  className={`object-contain ${shouldInvert ? 'brightness-0 invert' : ''}`} 
                />
              </div>
            </Link>
          );
        })}

      </nav>
    </div>
  );
}