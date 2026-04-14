"use client";

import { useCartStore } from '../../../../store/cartStore';
import { useState, useEffect } from 'react'; // ❗ Добавили useEffect
import Image from 'next/image';

// === ГАЛОЧКА ===
const CheckMark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-in zoom-in duration-200">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function DrinkTemplatePage() {
  // === СТЕЙТЫ КОРЗИНЫ ===
  const { items, addItem, changeQuantity, removeItem, orderType } = useCartStore();

  // ❗ МАГИЯ ДЛЯ СИНХРОНИЗАЦИИ ПАМЯТИ ❗
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ❗❗❗ 1. ТВОИ ЦЕНЫ И НАСТРОЙКИ (ЦИТРУС) ❗❗❗
  const pickupPrice = 300;   
  const deliveryPrice = 420; 
  const basePrice = orderType === 'delivery' ? deliveryPrice : pickupPrice;

  // ❗❗❗ 2. ТУТ ПИШЕШЬ ID И ИМЯ ❗❗❗
  const productId = 'citrus'; 
  const productName = 'Цитрус';       
  const productImg = '/images/citrus1.jpg'; 

  // === СТЕЙТЫ ДЛЯ КЛИКОВ ===
  const [selectedType, setSelectedType] = useState('Холодный');
  const [selectedVolume, setSelectedVolume] = useState('M'); // M или L
  const [cheeseSelected, setCheeseSelected] = useState(false);
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  
  // Взаимоисключающие добавки
  const [tapiocaSelected, setTapiocaSelected] = useState(false);
  const [juiceSelected, setJuiceSelected] = useState(false); 
  
  // Стейт для выпадающего списка Джус-боллов
  const [isJuiceOpen, setIsJuiceOpen] = useState(false);
  const [selectedJuiceFlavors, setSelectedJuiceFlavors] = useState<string[]>([]);

  // Стейты Крафтинга
  const [tapiocaX2Selected, setTapiocaX2Selected] = useState(false);
  const [juiceX2Selected, setJuiceX2Selected] = useState(false);

  const juiceFlavorsList = [
    'Персик', 'Черника', 'Личи', 'Клубника', 'Малина', 
    'Маракуйя', 'Манго', 'Яблоко', 'Киви', 'Йогурт', 'Апельсин'
  ];

  const handleTapiocaClick = () => {
    if (!tapiocaSelected) {
      setTapiocaSelected(true);
      setJuiceSelected(false);
      setJuiceX2Selected(false);
      setSelectedJuiceFlavors([]);
    } else {
      setTapiocaSelected(false);
      setTapiocaX2Selected(false);
    }
  };

  const handleJuiceFlavorClick = (flavor: string) => {
    const isSelected = selectedJuiceFlavors.includes(flavor);
    const maxFlavors = juiceX2Selected ? 2 : 1;

    if (isSelected) {
      const newFlavors = selectedJuiceFlavors.filter(f => f !== flavor);
      setSelectedJuiceFlavors(newFlavors);
      if (newFlavors.length === 0) {
        setJuiceSelected(false);
        setJuiceX2Selected(false);
      }
    } else {
      if (selectedJuiceFlavors.length < maxFlavors) {
        const newFlavors = [...selectedJuiceFlavors, flavor];
        setSelectedJuiceFlavors(newFlavors);
        setJuiceSelected(true);
        setTapiocaSelected(false);
        setTapiocaX2Selected(false);
      } else if (maxFlavors === 1) {
        setSelectedJuiceFlavors([flavor]);
        setJuiceSelected(true);
        setTapiocaSelected(false);
        setTapiocaX2Selected(false);
      }
    }
  };

  const handleJuiceX2Click = () => {
    if (juiceX2Selected) {
      setJuiceX2Selected(false);
      if (selectedJuiceFlavors.length > 1) {
        setSelectedJuiceFlavors([selectedJuiceFlavors[0]]);
      }
    } else {
      setJuiceX2Selected(true);
    }
  };

  // === СЧИТАЕМ ИТОГОВУЮ ЦЕНУ И СОБИРАЕМ ДОБАВКИ ===
  let finalPrice = basePrice;
  if (selectedVolume === 'L') finalPrice += 60; // ❗ Наценка за L (+60)
  if (cheeseSelected) finalPrice += 70;         // ❗ Наценка за сырную шапку
  if (tapiocaX2Selected || juiceX2Selected) finalPrice += 80;

  const toppingsList = [selectedType];
  if (cheeseSelected) toppingsList.push('Сырная шапка');
  
  if (tapiocaSelected) {
    toppingsList.push(tapiocaX2Selected ? 'Тапиока 2X' : 'Тапиока');
  } else if (juiceSelected && selectedJuiceFlavors.length > 0) {
    const flavors = selectedJuiceFlavors.join(' + ');
    toppingsList.push(`Джус-боллы (${flavors})${juiceX2Selected ? ' 2X' : ''}`);
  }

  // === МАГИЯ ИНТЕРАКТИВНОЙ КНОПКИ ===
  const currentCartItemId = `${productId}-${selectedVolume}-${toppingsList.join('-')}`;
  const itemInCart = items.find(item => item.cartItemId === currentCartItemId);

  const handleAddToCart = () => {
    addItem({
      cartItemId: currentCartItemId, 
      id: productId as any, 
      name: productName, 
      price: finalPrice,
      size: selectedVolume,
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
    if (itemInCart && itemInCart.quantity < 9) {
      changeQuantity(currentCartItemId, 1);
    } else {
      alert("Бро, лимит 9 штук на один напиток! 🧋");
    }
  };

  return (
    <div className="bg-[#FDFDFD] min-h-[100dvh] w-full flex justify-center overflow-y-auto overflow-x-hidden font-sans">
      <main className="w-full max-w-[370px] relative flex flex-col items-center pb-[120px]">
        
        <div className="relative w-[370px] h-[360px] shrink-0">
          <Image src="/images/citrus1.jpg" alt="Цитрус" fill quality={100} className="object-cover" priority />
          <div className="absolute bottom-0 left-0 w-full h-[120px] bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD]/80 to-transparent z-10 pointer-events-none" />
        </div>

        {/* === 2. ЗАГОЛОВОК === */}
        <div className="w-full px-[12px] mt-[16px] mb-[16px] z-20">
          {/* ДОБАВЛЕН font-extrabold */}
          <h1 className="text-[24px] uppercase tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text leading-none font-benzin font-extrabold">
            Цитрус
          </h1>
        </div>

        {/* === 3. КАРТОЧКА С ОПИСАНИЕМ (ШРИФТ BENZIN) === */}
        <div className="w-[346px] h-[150px] mb-[32px] bg-[#EEEEEE] border border-[#FFFFFF]/40 shadow-[0px_5px_5.7px_4px_rgba(255,0,140,0.25)] rounded-[25px] flex items-center justify-center z-20 backdrop-blur-[30px] box-border shrink-0">
          <div className="w-[322px] h-[130px] box-border overflow-y-auto no-scrollbar">
            {/* ДОБАВЛЕН font-medium */}
            <p className="text-[12px] text-[#272727] leading-[1.4] text-justify font-benzin font-medium uppercase opacity-80">
              Насыщенный ассам встречает солнечный апельсин и загадочные ноты блю-коросты. Яркий бодрящий микс с глубокой чайной основой дарит энергию и свежесть. В финале текстурный сюрприз на выбор: тапиока или взрывные джус-боллы.
            </p>
          </div>
        </div>

        <div 
          className={`w-[346px] mb-[96px] bg-[#AEAEAE]/25 rounded-[25px] flex flex-col items-center z-20 box-border relative overflow-hidden shrink-0 transition-all duration-500 ease-in-out ${isAddonsOpen ? 'max-h-[2500px] pb-[32px]' : 'max-h-[52px]'}`}
          style={{ 
            boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(8, 0, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          <div className="w-full h-[52px] flex justify-between items-center shrink-0 cursor-pointer px-[16px]" onClick={() => setIsAddonsOpen(!isAddonsOpen)}>
            <div className="flex items-center justify-start">
              <span className="text-[18px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none" style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>Дополнения</span>
            </div>
            <div className="w-[24px] h-[24px] relative shrink-0">
              <Image src="/icons/arrow.svg" alt="Стрелка" fill className={`object-contain transition-transform duration-300 ${isAddonsOpen ? 'rotate-90' : 'rotate-0'}`} />
            </div>
          </div>

          {/* ТИП */}
          <div className="w-[314px] h-[138px] mt-[16px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Тип</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] box-border shrink-0">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Холодный</span>
              <div onClick={() => setSelectedType('Холодный')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedType === 'Холодный' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedType === 'Холодный' && <CheckMark />}</div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className="w-full flex justify-between items-center mt-[12px] px-[16px] box-border shrink-0">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Горячий</span>
              <div onClick={() => setSelectedType('Горячий')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedType === 'Горячий' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedType === 'Горячий' && <CheckMark />}</div>
            </div>
          </div>

          {/* ДОБАВКИ */}
          <div className="w-[314px] h-fit pb-[16px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0 transition-all duration-500 overflow-hidden" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Добавки</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Тапиока</span>
              <div className="flex items-center gap-[10px] shrink-0">
                <div onClick={handleTapiocaClick} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${tapiocaSelected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{tapiocaSelected && <CheckMark />}</div>
              </div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0 cursor-pointer" onClick={() => setIsJuiceOpen(!isJuiceOpen)}>
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Джус боллы</span>
              <div className="w-[22px] h-[22px] shrink-0 flex items-center justify-center"><svg width="8" height="14" viewBox="0 0 8 14" fill="none" className={`transition-transform duration-300 ${isJuiceOpen ? 'rotate-90' : 'rotate-0'}`}><path d="M1 1.5L6.5 7L1 12.5" stroke="#949494" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            </div>
            <div className={`w-full flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isJuiceOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {juiceFlavorsList.map((flavor) => (
                <div key={flavor} className="w-full flex justify-between items-center px-[24px] mt-[16px] shrink-0">
                  <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold">{flavor}</span>
                  <div className="flex items-center gap-[10px] shrink-0">
                    <div onClick={() => handleJuiceFlavorClick(flavor)} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedJuiceFlavors.includes(flavor) ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedJuiceFlavors.includes(flavor) && <CheckMark />}</div>
                  </div>
                </div>
              ))}
              <div className="w-full h-[16px] shrink-0"></div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block font-extrabold" style={{ fontFamily: "'Benzin', sans-serif" }}>Сырная шапка</span>
              <div className="flex items-center gap-[10px] shrink-0">
                <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${cheeseSelected ? 'opacity-100' : 'opacity-0'}`} style={{ fontFamily: "'Benzin', sans-serif", fontWeight: 800 }}>+ 70 ₽</span>
                <div onClick={() => setCheeseSelected(!cheeseSelected)} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${cheeseSelected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{cheeseSelected && <CheckMark />}</div>
              </div>
            </div>
          </div>

          {/* КРАФТИНГ */}
          <div className="w-[314px] h-fit pb-[16px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0 font-benzin font-extrabold">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">Крафтинг</span>
            </div>
            <div className={`w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0 transition-opacity duration-300 ${tapiocaSelected ? 'opacity-100' : 'opacity-40 pointer-events-none'} font-benzin font-extrabold`}>
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">Тапиока 2X</span>
              <div className="flex items-center gap-[10px] shrink-0">
                <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${tapiocaX2Selected ? 'opacity-100' : 'opacity-0'}`}>+ 80 ₽</span>
                <div onClick={() => setTapiocaX2Selected(!tapiocaX2Selected)} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${tapiocaX2Selected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{tapiocaX2Selected && <CheckMark />}</div>
              </div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className={`w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0 transition-opacity duration-300 ${juiceSelected ? 'opacity-100' : 'opacity-40 pointer-events-none'} font-benzin font-extrabold`}>
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">Джус боллы 2X</span>
              <div className="flex items-center gap-[10px] shrink-0">
                <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${juiceX2Selected ? 'opacity-100' : 'opacity-0'}`}>+ 80 ₽</span>
                <div onClick={handleJuiceX2Click} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${juiceX2Selected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{juiceX2Selected && <CheckMark />}</div>
              </div>
            </div>
          </div>

          {/* ОБЪЁМ */}
          <div className="w-[314px] h-fit pb-[20px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
            <div className="mt-[16px] ml-[16px] shrink-0 font-benzin font-extrabold">
              <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">Объём</span>
            </div>
            <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0 font-benzin font-extrabold">
              {/* ДОБАВЛЕН font-normal ДЛЯ МЛ */}
              <div className="flex items-center"><span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">M</span><span className="text-[12px] tracking-[0.02em] text-[#949494] whitespace-nowrap leading-none block ml-[10px] font-benzin font-normal">500 ml</span></div>
              <div className="flex items-center gap-[10px] shrink-0">
                <div onClick={() => setSelectedVolume('M')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedVolume === 'M' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedVolume === 'M' && <CheckMark />}</div>
              </div>
            </div>
            <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
            <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0 font-benzin font-extrabold">
              {/* ДОБАВЛЕН font-normal ДЛЯ МЛ */}
              <div className="flex items-center"><span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">L</span><span className="text-[12px] tracking-[0.02em] text-[#949494] whitespace-nowrap leading-none block ml-[10px] font-benzin font-normal">700 ml</span></div>
              <div className="flex items-center gap-[10px] shrink-0">
                <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${selectedVolume === 'L' ? 'opacity-100' : 'opacity-0'}`}>+ 60 ₽</span>
                <div onClick={() => setSelectedVolume('L')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedVolume === 'L' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedVolume === 'L' && <CheckMark />}</div>
              </div>
            </div>
          </div>
        </div>

        {/* УМНАЯ КНОПКА */}
        <div className="w-[346px] h-[56px] mb-[20px] z-20 shrink-0">
          {!isMounted ? (
            <div className="w-full h-full bg-[#EEEEEE] rounded-[25px] flex justify-center items-center shadow-sm">
              <span className="text-[#949494] font-['Benzin'] text-[12px] uppercase">Сверка с корзиной...</span>
            </div>
          ) : itemInCart ? (
            <div className="w-full h-full bg-[#FFFFFF]/30 backdrop-blur-xl border border-white/80 rounded-[25px] shadow-[0_4px_12px_rgba(255,0,140,0.15)] flex justify-between items-center px-[24px] box-border">
              <button onClick={handleMinus} className="w-[40px] h-[40px] flex items-center justify-center active:scale-95 transition-transform"><Image src="/icons/minus.svg" alt="-" width={20} height={20} className="object-contain" /></button>
              <span className="text-[22px] font-black tracking-[0.02em] text-[#FF008C] leading-none">{itemInCart.quantity}</span>
              <button onClick={handlePlus} className="w-[40px] h-[40px] flex items-center justify-center active:scale-95 transition-transform"><Image src="/icons/plus.svg" alt="+" width={20} height={20} className="object-contain" /></button>
            </div>
          ) : (
            <button onClick={handleAddToCart} className="w-full h-full bg-[#FFD1F5]/40 backdrop-blur-xl border border-white/80 rounded-[25px] shadow-[0_4px_12px_rgba(255,0,140,0.15)] flex justify-center items-center active:scale-95 transition-transform">
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