'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../store/cartStore'; // ❗ ДОБАВИЛИ ХРАНИЛИЩЕ ❗

export default function BottomNav() {
  const pathname = usePathname();

  // ❗ СЧИТАЕМ СКОЛЬКО ТОВАРОВ В КОРЗИНЕ ❗
  const totalItems = useCartStore(state => state.items.reduce((sum, item) => sum + item.quantity, 0));

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
      
      {/* Главный контейнер меню УВЕЛИЧЕН: ширина 250px, высота 50px */}
      <nav className="relative w-[250px] h-[50px] bg-[#6C6C6C]/20 backdrop-blur-xl rounded-full border border-[#FFFFFF]/40 shadow-[0px_4px_6px_2px_rgba(45,45,45,0.15)] flex items-center px-[4px] overflow-hidden">
        
        {/* === АНИМИРОВАННЫЙ "ЖИДКИЙ" ПРЯМОУГОЛЬНИК (УВЕЛИЧЕН) === */}
        <div 
          className="absolute h-[42px] w-[76px] bg-[#FFFFFF]/20 backdrop-blur-md border border-[#FFFFFF]/40 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
          style={{ left: `${4 + (activeIndex * 80)}px` }}
        />

        {/* === САМИ КНОПКИ === */}
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          const shouldInvert = isBubblikPage && item.name !== 'Баблик';

          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className="relative w-[80px] h-full flex justify-center items-center z-10"
            >
              {/* ИКОНКА УВЕЛИЧЕНА (w-6 h-6) */}
              <div className="relative w-6 h-6 transition-transform duration-300 active:scale-75">
                <Image
                  src={isActive ? item.iconThick : item.iconThin}
                  alt={item.name}
                  fill
                  className={`object-contain ${shouldInvert ? 'brightness-0 invert' : ''}`} 
                />
                
                {/* ❗ КРАСНЫЙ СЧЕТЧИК КОРЗИНЫ (УВЕЛИЧЕННЫЙ + 9+) ❗ */}
                {item.name === 'Корзина' && totalItems > 0 && (
                  <div className="absolute -top-2 -right-3 bg-[#FF0040] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[4px] flex items-center justify-center rounded-full shadow-md leading-none">
                    {totalItems > 9 ? '9+' : totalItems}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}