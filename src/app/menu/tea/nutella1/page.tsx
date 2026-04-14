"use client";

import { useCartStore } from '../../../../store/cartStore';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// === ГАЛОЧКА ===
const CheckMark = () => (
  <motion.svg 
    initial={{ scale: 0.5, opacity: 0 }} 
    animate={{ scale: 1, opacity: 1 }}
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </motion.svg>
);

export default function NutellaPage() {
  const { items, addItem, changeQuantity, removeItem, orderType } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  // ❗ НАСТРОЙКИ НАПИТКА ❗
  const settings = {
    id: 'nutella1',
    name: 'Нутелла',
    img: '/images/nutella1.jpg',
    prices: { pickup: 330, delivery: 450 }
  };

  // ЗАЩИТА VERCEL
  useEffect(() => { 
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // СТЕЙТЫ (Вернул правильные названия с "Selected")
  const [selectedType, setSelectedType] = useState('Холодный');
  const [selectedVolume, setSelectedVolume] = useState('M');
  const [cheeseSelected, setCheeseSelected] = useState(false);
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  const [tapiocaSelected, setTapiocaSelected] = useState(false);
  const [selectedJuiceFlavors, setSelectedJuiceFlavors] = useState<string[]>([]);
  const [isJuiceOpen, setIsJuiceOpen] = useState(false);
  const [tapiocaX2Selected, setTapiocaX2Selected] = useState(false);
  const [juiceX2Selected, setJuiceX2Selected] = useState(false);

  const juiceFlavorsList = ['Персик', 'Черника', 'Личи', 'Клубника', 'Малина', 'Маракуйя', 'Манго', 'Яблоко', 'Киви', 'Йогурт', 'Апельсин'];

  // ЛОГИКА ДОБАВОК (ВЕРНУЛ ТВОИ ФУНКЦИИ!)
  const handleTapiocaClick = () => {
    if (!tapiocaSelected) {
      setTapiocaSelected(true);
      setSelectedJuiceFlavors([]);
      setJuiceX2Selected(false);
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
      if (newFlavors.length === 0) setJuiceX2Selected(false);
    } else {
      if (selectedJuiceFlavors.length < maxFlavors) {
        setSelectedJuiceFlavors([...selectedJuiceFlavors, flavor]);
        setTapiocaSelected(false);
        setTapiocaX2Selected(false);
      } else if (maxFlavors === 1) {
        setSelectedJuiceFlavors([flavor]);
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

  // РАСЧЕТ ЦЕНЫ (Теперь без ошибок!)
  const finalPrice = useMemo(() => {
    let price = orderType === 'delivery' ? settings.prices.delivery : settings.prices.pickup;
    if (selectedVolume === 'L') price += 60;
    if (cheeseSelected) price += 70;
    if (tapiocaX2Selected || juiceX2Selected) price += 80;
    return price;
  }, [orderType, selectedVolume, cheeseSelected, tapiocaX2Selected, juiceX2Selected]);

  // СПИСОК ДОБАВОК
  const toppingsList = useMemo(() => {
    const list = [selectedType];
    if (cheeseSelected) list.push('Сырная шапка');
    if (tapiocaSelected) list.push(tapiocaX2Selected ? 'Тапиока 2X' : 'Тапиока');
    else if (selectedJuiceFlavors.length > 0) {
      list.push(`Джус-боллы (${selectedJuiceFlavors.join(' + ')})${juiceX2Selected ? ' 2X' : ''}`);
    }
    return list;
  }, [selectedType, cheeseSelected, tapiocaSelected, tapiocaX2Selected, selectedJuiceFlavors, juiceX2Selected]);

  const cartId = `${settings.id}-${selectedVolume}-${toppingsList.join('-')}`;
  const itemInCart = items ? items.find(i => i.cartItemId === cartId) : null;

  // ФУНКЦИИ КОРЗИНЫ
  const handleAddToCart = () => {
    addItem({
      cartItemId: cartId, 
      id: settings.id as any, 
      name: settings.name, 
      price: finalPrice,
      size: selectedVolume,
      toppings: toppingsList,
      img: settings.img, 
      quantity: 1
    });
  };

  const handleMinus = () => {
    if (itemInCart) {
      if (itemInCart.quantity > 1) {
        changeQuantity(cartId, -1);
      } else {
        removeItem(cartId);
      }
    }
  };

  const handlePlus = () => {
    if (itemInCart && itemInCart.quantity < 9) {
      changeQuantity(cartId, 1);
    } else if (!itemInCart) {
      alert("Бро, лимит 9 штук на один вид напитка! 🧋");
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#FDFDFD]" />;

  return (
    <div className="bg-[#FDFDFD] min-h-screen w-full flex justify-center font-benzin overflow-x-hidden">
      <main className="w-full max-w-[370px] relative flex flex-col items-center pb-[140px]">

        {/* === 1. КАРТИНКА И ГРАДИЕНТЫ === */}
        <div className="relative w-[370px] h-[360px] shrink-0">
          <Image src={settings.img} alt={settings.name} fill className="object-cover" priority />
          <div className="absolute bottom-0 left-0 w-full h-[120px] bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD]/80 to-transparent z-10 pointer-events-none" />
        </div>

        {/* === 2. ЗАГОЛОВОК === */}
        <div className="w-full px-[12px] mt-[16px] mb-[16px] z-20">
          <h1 className="text-[24px] font-black uppercase tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text leading-none font-benzin">
            {settings.name}
          </h1>
        </div>

        {/* === 3. КАРТОЧКА С ОПИСАНИЕМ (ИСПРАВЛЕН ШРИФТ) === */}
        <div className="w-[346px] h-[150px] mb-[32px] bg-[#EEEEEE] border border-[#FFFFFF]/40 shadow-[0px_5px_5.7px_4px_rgba(255,0,140,0.25)] rounded-[25px] flex items-center justify-center z-20 backdrop-blur-[30px] box-border shrink-0">
          <div className="w-[322px] h-[130px] box-border overflow-y-auto no-scrollbar">
            <p className="text-[12px] text-[#272727] leading-[1.4] text-justify uppercase opacity-80" style={{ fontFamily: "'Benzin-Regular', sans-serif" }}>
              Нутелла — жидкая ностальгия. Густой томный шоколад с ореховым шепотом нутеллы, укрытый воздушной сырной шапкой. Молоко смягчает эту роскошь, а на дне вас ждёт приятный сюрприз — на выбор: классические жемчужины тапиоки или взрывные джус-боллы. Каждый глоток — тёплое воспоминание с текстурным восторгом.
            </p>
          </div>
        </div>

        {/* === 4. РАСКРЫТЫЙ БЛОК "ДОПОЛНЕНИЯ" === */}
        <div 
          className={`w-[346px] mb-[96px] bg-[#AEAEAE]/25 rounded-[25px] flex flex-col items-center z-20 box-border relative overflow-hidden shrink-0 transition-all duration-500 ease-in-out ${isAddonsOpen ? 'max-h-[2500px] pb-[32px]' : 'max-h-[52px]'}`}
          style={{ 
            boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(8, 0, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)'
          }}
        >
          {/* ШАПКА "Дополнения" */}
          <div className="w-full h-[52px] flex justify-between items-center shrink-0 cursor-pointer px-[16px]" onClick={() => setIsAddonsOpen(!isAddonsOpen)}>
            <div className="flex items-center justify-start">
              <span className="text-[18px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none font-benzin font-extrabold">Дополнения</span>
            </div>
            <div className="w-[24px] h-[24px] relative shrink-0">
              <motion.div animate={{ rotate: isAddonsOpen ? 90 : 0 }}>
                <Image src="/icons/arrow.svg" alt="v" width={24} height={24} className="object-contain" />
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {isAddonsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full flex flex-col"
              >
                {/* ТИП */}
                <div className="w-[314px] h-[138px] mt-[16px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0 mx-auto" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
                  <div className="mt-[16px] ml-[16px] shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] whitespace-nowrap bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Тип</span>
                  </div>
                  <div className="w-full flex justify-between items-center mt-[16px] px-[16px] box-border shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Холодный</span>
                    <div onClick={() => setSelectedType('Холодный')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedType === 'Холодный' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedType === 'Холодный' && <CheckMark />}</div>
                  </div>
                  <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
                  <div className="w-full flex justify-between items-center mt-[12px] px-[16px] box-border shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Горячий</span>
                    <div onClick={() => setSelectedType('Горячий')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedType === 'Горячий' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedType === 'Горячий' && <CheckMark />}</div>
                  </div>
                </div>

                {/* ДОБАВКИ */}
                <div className="w-[314px] h-fit pb-[16px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0 transition-all duration-500 mx-auto" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
                  <div className="mt-[16px] ml-[16px] shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Добавки</span>
                  </div>
                  <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Тапиока</span>
                    <div className="flex items-center gap-[10px] shrink-0">
                      <div onClick={handleTapiocaClick} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${tapiocaSelected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{tapiocaSelected && <CheckMark />}</div>
                    </div>
                  </div>
                  <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
                  <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0 cursor-pointer font-benzin font-extrabold" onClick={() => setIsJuiceOpen(!isJuiceOpen)}>
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Джус боллы</span>
                    <div className="w-[22px] h-[22px] shrink-0 flex items-center justify-center"><svg width="8" height="14" viewBox="0 0 8 14" fill="none" className={`transition-transform duration-300 ${isJuiceOpen ? 'rotate-90' : 'rotate-0'}`}><path d="M1 1.5L6.5 7L1 12.5" stroke="#949494" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  </div>
                  <div className={`w-full flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isJuiceOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    {juiceFlavorsList.map((flavor) => (
                      <div key={flavor} className="w-full flex justify-between items-center px-[24px] mt-[16px] shrink-0 font-benzin font-extrabold">
                        <span className="text-[14px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">{flavor}</span>
                        <div className="flex items-center gap-[10px] shrink-0">
                          <div onClick={() => handleJuiceFlavorClick(flavor)} className={`w-[20px] h-[20px] rounded-[4px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedJuiceFlavors.includes(flavor) ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedJuiceFlavors.includes(flavor) && <CheckMark />}</div>
                        </div>
                      </div>
                    ))}
                    <div className="w-full h-[16px] shrink-0"></div>
                  </div>
                  <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
                  <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block">Сырная шапка</span>
                    <div className="flex items-center gap-[10px] shrink-0">
                      <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${cheeseSelected ? 'opacity-100' : 'opacity-0'}`}>+ 70 ₽</span>
                      <div onClick={() => setCheeseSelected(!cheeseSelected)} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${cheeseSelected ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{cheeseSelected && <CheckMark />}</div>
                    </div>
                  </div>
                </div>

                {/* КРАФТИНГ */}
                <div className="w-[314px] h-fit pb-[16px] mt-[32px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0 mx-auto" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
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
                <div className="w-[314px] h-fit pb-[20px] mt-[32px] mb-[20px] bg-[#AEAEAE]/20 rounded-[25px] flex flex-col box-border shrink-0 mx-auto" style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(255, 0, 140, 0.25)' }}>
                  <div className="mt-[16px] ml-[16px] shrink-0 font-benzin font-extrabold">
                    <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">Объём</span>
                  </div>
                  <div className="w-full flex justify-between items-center mt-[16px] px-[16px] shrink-0 font-benzin font-extrabold">
                    <div className="flex items-center">
                      <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">M</span>
                      <span className="text-[12px] tracking-[0.02em] text-[#949494] whitespace-nowrap leading-none block ml-[10px]" style={{ fontFamily: "'Benzin-Regular', sans-serif" }}>500 ml</span>
                    </div>
                    <div className="flex items-center gap-[10px] shrink-0">
                      <div onClick={() => setSelectedVolume('M')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedVolume === 'M' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedVolume === 'M' && <CheckMark />}</div>
                    </div>
                  </div>
                  <div className="w-[282px] h-[1px] bg-[#BEBEBE] rounded-full mx-auto mt-[12px] shrink-0"></div>
                  <div className="w-full flex justify-between items-center mt-[12px] px-[16px] shrink-0 font-benzin font-extrabold">
                    <div className="flex items-center">
                      <span className="text-[16px] tracking-[0.02em] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent leading-none block uppercase">L</span>
                      <span className="text-[12px] tracking-[0.02em] text-[#949494] whitespace-nowrap leading-none block ml-[10px]" style={{ fontFamily: "'Benzin-Regular', sans-serif" }}>700 ml</span>
                    </div>
                    <div className="flex items-center gap-[10px] shrink-0">
                      <span className={`text-[12px] text-[#FF008C] whitespace-nowrap transition-all duration-300 ${selectedVolume === 'L' ? 'opacity-100' : 'opacity-0'}`}>+ 60 ₽</span>
                      <div onClick={() => setSelectedVolume('L')} className={`w-[22px] h-[22px] rounded-[6px] border cursor-pointer flex items-center justify-center transition-all duration-300 shrink-0 ${selectedVolume === 'L' ? 'bg-[#FF008C] border-[#FF008C] shadow-[0_0_10px_rgba(255,0,140,0.5)]' : 'border-[#949494] bg-transparent'}`}>{selectedVolume === 'L' && <CheckMark />}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* УМНАЯ КНОПКА (НИЖНЯЯ) */}
        <div className="fixed bottom-0 left-0 w-full h-[100px] bg-white/80 backdrop-blur-xl border-t border-black/5 flex items-center justify-center z-50">
          <div className="w-[346px] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Итого</span>
              <span className="text-[20px] font-bold text-black">{finalPrice} ₽</span>
            </div>

            {itemInCart ? (
              <div className="flex items-center bg-[#F2F2F7] rounded-full p-1 border border-black/5 shadow-inner">
                <button onClick={handleMinus} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform">
                   <Image src="/icons/minus.svg" alt="-" width={16} height={16} />
                </button>
                <span className="w-8 text-center font-bold text-[18px] font-benzin">{itemInCart.quantity}</span>
                <button onClick={handlePlus} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform">
                   <Image src="/icons/plus.svg" alt="+" width={16} height={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAddToCart}
                className="bg-gradient-to-r from-[#FF00EE] to-[#FF008C] px-8 py-4 rounded-full shadow-lg shadow-pink-500/30 active:scale-95 transition-all"
              >
                <span className="text-white font-bold text-[14px] uppercase tracking-wider font-benzin">В корзину</span>
              </button>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}