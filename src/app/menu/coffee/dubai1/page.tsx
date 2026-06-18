"use client";

import { useCartStore } from '../../../../store/cartStore';
import { useState, useEffect } from 'react'; // ❗ Добавили useEffect
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // добавить для кнопки

const CheckMark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-in zoom-in duration-200">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function CoffeeTemplatePage() { // весь блок добавляем для кнопки 
  const router = useRouter(); // ❗ ДОБАВЛЯЕМ РОУТЕР
  const { items, addItem, changeQuantity, removeItem, orderType } = useCartStore();

  // ❗ МАГИЯ ДЛЯ СИНХРОНИЗАЦИИ ПАМЯТИ ❗
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ❗❗❗ 1. ТВОИ ЦЕНЫ ❗❗❗
  const pickupPrice = 380;   
  const deliveryPrice = 500; 

  const basePrice = orderType === 'delivery' ? deliveryPrice : pickupPrice;

  // ❗❗❗ 2. ТУТ ПИШЕШЬ ID И ИМЯ ❗❗❗
  const productId = 'dubai1'; 
  const productName = 'Дубайский';       
  const productImg = '/images/dubai1.jpg'; // ❗❗❗ 3. ФОТКА ДЛЯ КОРЗИНЫ ❗❗❗

  const [selectedType, setSelectedType] = useState('Холодный');
  const [cheeseSelected, setCheeseSelected] = useState(false);
  // Стоп-лист
  const [cheeseInStop, setCheeseInStop] = useState(false);
  const [tapiocaInStop, setTapiocaInStop] = useState(false);
  const [tapioca2xInStop, setTapioca2xInStop] = useState(false);
  const [juice2xInStop, setJuice2xInStop] = useState(false);
  const [isAddonsOpen, setIsAddonsOpen] = useState(false); // две строчки нужно вставить
  const [hasOpenedAddons, setHasOpenedAddons] = useState(false);
  
  // ❗ 1. Делаем Тапиоку включенной по умолчанию ❗
  const [tapiocaSelected, setTapiocaSelected] = useState(true);
  const [tapiocaX2Selected, setTapiocaX2Selected] = useState(false);

  // Проверка стоп-листа базовых топпингов (сырная шапка / тапиока)
  useEffect(() => {
    fetch('/api/toppings').then(r => r.json()).then(json => {
      const names = (json.toppings || []).map((t: any) => (t.name || '').toLowerCase());
      const cheeseActive = names.some((n: string) => n.includes('сырн'));
      const tapiocaActive = names.some((n: string) => n.includes('тапиока') && !n.includes('2x') && !n.includes('2х'));
      const tapioca2xActive = names.some((n: string) => n.includes('тапиока') && (n.includes('2x') || n.includes('2х')));
      setCheeseInStop(!cheeseActive);
      setTapiocaInStop(!tapiocaActive);
      setTapioca2xInStop(!tapioca2xActive);
      setJuice2xInStop(true); // на кофе джус-боллов нет
      if (!cheeseActive) setCheeseSelected(false);
      if (!tapiocaActive) setTapiocaSelected(false);
      if (!tapioca2xActive) setTapiocaX2Selected(false);
    }).catch(() => {});
  }, []);


  // === СЧИТАЕМ ИТОГОВУЮ ЦЕНУ И СОБИРАЕМ ДОБАВКИ ===
  let finalPrice = basePrice;
  if (cheeseSelected) finalPrice += 70;
  if (tapiocaX2Selected) finalPrice += 80;

  const toppingsList = [selectedType];
  if (cheeseSelected) toppingsList.push('Сырная шапка');
  toppingsList.push(tapiocaX2Selected ? 'Тапиока 2X' : 'Тапиока');

  // === МАГИЯ ИНТЕРАКТИВНОЙ КНОПКИ ===
  const currentCartItemId = `${productId}-M-${toppingsList.join('-')}`;
  const itemInCart = items.find(item => item.cartItemId === currentCartItemId);

  const handleAddToCart = () => {
    addItem({
      cartItemId: currentCartItemId, // ❗ ID для корзины ❗
      id: productId as any, 
      name: productName, 
      price: finalPrice,
      size: 'M',
      toppings: toppingsList,
      img: productImg, 
      quantity: 1
    });
  };

  const handleMinus = () => {
    if (itemInCart) {
      if (itemInCart.quantity > 1) {
        changeQuantity(currentCartItemId, -1);
      } else {
        removeItem(currentCartItemId);
      }
    }
  };

  const handlePlus = () => {
    // ❗ Проверка на 9 штук ❗
    if (itemInCart && itemInCart.quantity < 9) {
      changeQuantity(currentCartItemId, 1);
    } else {
      alert("Максимум 9 напитков одного вида в заказе 🧋");
    }
  };

  return (
    // ❗ ФИКС ШИРИНЫ НА 370px ❗
    <div className="bg-[#FDFDFD] min-h-[100dvh] w-full flex justify-center overflow-y-auto overflow-x-hidden font-sans">
      <main className="w-full max-w-[370px] relative flex flex-col items-center pb-[120px]">
        
        {/* ❗ КНОПКА НАЗАД (С БЕЛОЙ СТРЕЛКОЙ) ❗ */} 
        <button 
          onClick={() => router.back()} 
          className="absolute top-[16px] left-[16px] w-[40px] h-[40px] bg-white/30 backdrop-blur-lg rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.1)] z-50 active:scale-90 transition-transform border border-white/40"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button> 
        
        {/* КАРТИНКА И ГРАДИЕНТЫ (370px) */}
        <div className="relative w-[370px] h-[360px] shrink-0">
          {/* ❗❗❗ 4. МЕНЯТЬ ФОТКУ НА СТРАНИЦЕ ТУТ ❗❗❗ */}
          <Image src="/images/dubai1.jpg" alt="Дубайский" fill quality={100} className="object-cover" priority />
          <div className="absolute bottom-0 left-0 w-full h-[120px] bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD]/80 to-transparent z-10 pointer-events-none" />
        </div>

        {/* === 2. ЗАГОЛОВОК === */}
        <div className="w-full px-[12px] mt-[16px] mb-[16px] z-20">
          {/* ДОБАВЛЕН font-extrabold */}
          <h1 className="text-[24px] uppercase tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text leading-none font-benzin font-extrabold">
            Дубайский
          </h1>
        </div>

        {/* === 3. КАРТОЧКА С ОПИСАНИЕМ (СО СКРОЛЛ-ПОДСКАЗКОЙ) === */}
        {/* Добавили relative для позиционирования тени */}
        <div className="relative w-[346px] h-[150px] mb-[32px] bg-[#EEEEEE] border border-[#FFFFFF]/40 shadow-[0px_5px_5.7px_4px_rgba(255,0,140,0.25)] rounded-[25px] z-20 backdrop-blur-[30px] box-border shrink-0 flex flex-col pt-[20px] overflow-hidden">
          
          {/* Сам скроллящийся текст (добавили pb-[30px] чтобы текст можно было докрутить выше тени) */}
          <div className="w-full h-full overflow-y-auto no-scrollbar px-[20px] pb-[30px]">
            <p className="text-[12px] text-[#272727] leading-[1.4] text-left font-benzin font-normal opacity-90 tracking-[0.02em] m-0">
              Фисташковая роскошь и шоколадная глубина в союзе с эспрессо и сливками. Настоящее восточное наслаждение в большом формате с бархатистой текстурой. И тапиока на дне добавляет изысканную игру текстур
            </p>
          </div>

          {/* ❗ ГРАДИЕНТНАЯ ТЕНЬ ВНИЗУ (ПОДСКАЗКА ДЛЯ СКРОЛЛА) ❗ */}
          <div className="absolute bottom-0 left-0 w-full h-[40px] bg-gradient-to-t from-[#EEEEEE] via-[#EEEEEE]/90 to-transparent pointer-events-none rounded-b-[25px]" />
        </div>

        {/* ДОПОЛНЕНИЯ (346px) */}
        <div 
          className={`w-[346px] mb-[96px] bg-[#AEAEAE]/25 rounded-[25px] flex flex-col items-center z-20 box-border relative overflow-hidden shrink-0 transition-all duration-500 ease-in-out ${isAddonsOpen ? 'max-h-[2500px] pb-[32px]' : 'max-h-[52px]'}`}
          style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(8, 0, 255, 0.25)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
        >
         {/* весь блок вставить нужно */}
        <div className="w-full min-h-[52px] flex justify-between items-center shrink-0 cursor-pointer px-[16px] py-[14px]" onClick={() => { setIsAddonsOpen(!isAddonsOpen); setHasOpenedAddons(true); }}>
  <div className="flex flex-col">
    <span className="text-[18px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none font-benzin font-extrabold">Дополнения</span>
    {!hasOpenedAddons && !isAddonsOpen && (
      <span className="text-[9px] text-[#FF008C]/60 font-benzin font-bold uppercase mt-[3px] animate-pulse">
        Нажми, чтобы настроить 👆
      </span>
    )}
  </div>
            <div className="w-[24px] h-[24px] relative shrink-0">
              <Image src="/icons/arrow.svg" alt="Стрелка" fill className={`object-contain transition-transform duration-300 ${isAddonsOpen ? 'rotate-90' : 'rotate-0'}`} />
            </div>
          </div>

          {/* ТИП (314px внутри) */}
          <div className="w-[314px] h-[138px] mt-[16px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Тип</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] box-border shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Холодный</span>
              <div onClick={() => setSelectedType('Холодный')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedType === 'Холодный' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>
                {selectedType === 'Холодный' && <CheckMark />}
              </div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className="w-full flex justify-between items-center mt-[12px] px-[16px] box-border shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Горячий</span>
              <div onClick={() => setSelectedType('Горячий')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedType === 'Горячий' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>
                {selectedType === 'Горячий' && <CheckMark />}
              </div>
            </div>
          </div>

          {/* ДОБАВКИ */}
          <div className="w-[314px] h-fit pb-[16px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0 transition-all duration-500 overflow-hidden" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Добавки</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Тапиока</span>
              <div className="flex items-center gap-[10px] shrink-0">
                <div className="w-[22px] h-[22px] rounded-[6px] border flex items-center justify-center transition-all duration-300 shrink-0 bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]">
                  <CheckMark />
                </div>
              </div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Сырная шапка</span>
              <div className="flex items-center gap-[10px] shrink-0">
                <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${cheeseSelected ? 'opacity-100' : 'opacity-0'}`} style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>+ 70 ₽</span>
                <div onClick={cheeseInStop ? undefined : () => setCheeseSelected(!cheeseSelected)} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${cheeseSelected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>
                  {cheeseSelected && <CheckMark />}
                </div>
              </div>
            </div>
          </div>

          {/* КРАФТИНГ */}
          <div className="w-[314px] h-[82px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Крафтинг</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0 transition-opacity duration-300 opacity-100">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Тапиока 2X</span>
              <div className="flex items-center gap-[10px] shrink-0">
                 <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${tapiocaX2Selected ? 'opacity-100' : 'opacity-0'}`} style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>+ 80 ₽</span>
                <div onClick={tapioca2xInStop ? undefined : () => setTapiocaX2Selected(!tapiocaX2Selected)} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${tapiocaX2Selected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>
                  {tapiocaX2Selected && <CheckMark />}
                </div>
              </div>
            </div>
          </div>

          {/* ОБЪЁМ */}
          <div className="w-[314px] h-[108px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Объём</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0">
              <div className="flex items-center">
                 <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>M</span>
                 <span className="text-[12px] tracking-[0.02em] text-[#949494] whitespace-nowrap leading-none block ml-[10px] font-benzin font-normal" >500 ml</span>
              </div>
              <div className="flex items-center gap-[10px] shrink-0">
                <div className="w-[22px] h-[22px] rounded-[6px] border flex items-center justify-center transition-all duration-300 shrink-0 bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]">
                  <CheckMark />
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* УМНАЯ КНОПКА (С РЕШЕНИЕМ РАССИНХРОНА) весь блок нужно вставит */}
        <div className="w-[346px] flex flex-col gap-[10px] mb-[20px] z-20 shrink-0">
          {!isMounted ? (
            /* Пока память подгружается - рисуем красивую заглушку */
            <div className="w-full h-[56px] bg-[#EEEEEE] rounded-[25px] flex justify-center items-center shadow-sm">
              <span className="text-[#949494] font-['Benzin'] text-[12px] uppercase">Сверка с корзиной...</span>
            </div>
          ) : itemInCart ? (
            /* СЧЕТЧИК + КНОПКА ПЕРЕЙТИ */
            <>
              <div className="w-full h-[56px] bg-[#FFFFFF]/30 backdrop-blur-xl border border-white/80 rounded-[25px] shadow-[0_4px_12px_rgba(255,0,140,0.15)] flex justify-between items-center px-[24px] box-border">
                <button onClick={handleMinus} className="w-[40px] h-[40px] flex items-center justify-center active:scale-95 transition-transform">
                  <Image src="/icons/minus.svg" alt="-" width={20} height={20} className="object-contain" />
                </button>
                <span className="text-[22px] font-black tracking-[0.02em] text-[#FF008C] leading-none" style={{ fontFamily: "'Benzin', sans-serif" }}>
                  {itemInCart.quantity}
                </span>
                <button onClick={handlePlus} className="w-[40px] h-[40px] flex items-center justify-center active:scale-95 transition-transform">
                  <Image src="/icons/plus.svg" alt="+" width={20} height={20} className="object-contain" />
                </button>
              </div>
              <button onClick={() => router.push('/cart')} className="w-full h-[52px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] rounded-[25px] flex items-center justify-center active:scale-95 transition-transform shadow-[0_4px_15px_rgba(255,0,140,0.35)]">
                <span className="text-[16px] font-extrabold text-white uppercase tracking-wide" style={{ fontFamily: "'Benzin', sans-serif" }}>Перейти в корзину →</span>
              </button>
            </>
          ) : (
            /* КНОПКА В КОРЗИНУ */
            <button 
              onClick={handleAddToCart} 
              className="w-full h-[56px] bg-[#FFD1F5]/40 backdrop-blur-xl border border-white/80 rounded-[25px] shadow-[0_4px_12px_rgba(255,0,140,0.15)] flex justify-center items-center active:scale-95 transition-transform"
            >
              <span className="text-[20px] font-black tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text leading-none flex items-center gap-[12px]" style={{ fontFamily: "'Benzin', sans-serif" }}>
                <span>В корзину</span>
              </span>
            </button>
          )}
            </div>
                
              </main>
            </div>
          );
        }