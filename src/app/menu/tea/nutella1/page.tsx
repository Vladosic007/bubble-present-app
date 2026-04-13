"use client";

import { useCartStore } from '../../../../store/cartStore';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Компонент галочки
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
    img: '/images/nutella1.jpg', // Проверь, что в папке файл маленькими буквами!
    prices: { pickup: 330, delivery: 450 }
  };

  useEffect(() => { setIsMounted(true); }, []);

  // Состояния
  const [selectedType, setSelectedType] = useState('Холодный');
  const [selectedVolume, setSelectedVolume] = useState('M');
  const [cheeseSelected, setCheeseSelected] = useState(false);
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  const [tapiocaSelected, setTapiocaSelected] = useState(false);
  const [selectedJuiceFlavors, setSelectedJuiceFlavors] = useState<string[]>([]);
  const [isJuiceOpen, setIsJuiceOpen] = useState(false);
  const [tapiocaX2, setTapiocaX2] = useState(false);
  const [juiceX2, setJuiceX2] = useState(false);

  const juiceFlavorsList = ['Персик', 'Черника', 'Личи', 'Клубника', 'Малина', 'Маракуйя', 'Манго', 'Яблоко', 'Киви', 'Йогурт', 'Апельсин'];

  // Расчет цены (useMemo чтобы не лагало)
  const finalPrice = useMemo(() => {
    let price = orderType === 'delivery' ? settings.prices.delivery : settings.prices.pickup;
    if (selectedVolume === 'L') price += 60;
    if (cheeseSelected) price += 70;
    if (tapiocaX2 || juiceX2) price += 80;
    return price;
  }, [orderType, selectedVolume, cheeseSelected, tapiocaX2, juiceX2]);

  // Список добавок для корзины
  const toppingsList = useMemo(() => {
    const list = [selectedType];
    if (cheeseSelected) list.push('Сырная шапка');
    if (tapiocaSelected) list.push(tapiocaX2 ? 'Тапиока 2X' : 'Тапиока');
    else if (selectedJuiceFlavors.length > 0) {
      list.push(`Джус-боллы (${selectedJuiceFlavors.join(' + ')})${juiceX2 ? ' 2X' : ''}`);
    }
    return list;
  }, [selectedType, cheeseSelected, tapiocaSelected, tapiocaX2, selectedJuiceFlavors, juiceX2]);

  const cartId = `${settings.id}-${selectedVolume}-${toppingsList.join('-')}`;
  const itemInCart = items.find(i => i.cartItemId === cartId);

  if (!isMounted) return null;

  return (
    <div className="bg-[#FAFAFA] min-h-screen w-full flex justify-center font-benzin overflow-x-hidden">
      <main className="w-full max-w-[370px] relative flex flex-col items-center pb-[140px]">
        
        {/* Кнопка Назад */}
        <button onClick={() => window.history.back()} className="absolute top-6 left-6 z-30 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm">
          <Image src="/icons/arrow-left.svg" alt="назад" width={20} height={20} />
        </button>

        {/* Картинка */}
        <div className="relative w-full h-[380px] shrink-0">
          <Image src={settings.img} alt={settings.name} fill className="object-cover" priority />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#FAFAFA] to-transparent" />
        </div>

        {/* Заголовок */}
        <div className="w-full px-4 -mt-6 z-20">
          <h1 className="text-[32px] font-bold uppercase tracking-tight bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-transparent bg-clip-text">
            {settings.name}
          </h1>
        </div>

        {/* Описание */}
        <div className="w-[346px] mt-6 p-6 bg-white/80 border border-white rounded-[30px] shadow-xl shadow-pink-500/10 backdrop-blur-md">
          <p className="text-[12px] text-[#413F40] leading-relaxed text-center font-medium uppercase opacity-80">
            Нутелла — жидкая ностальгия. Густой томный шоколад с ореховым шепотом нутеллы, укрытый воздушной сырной шапкой. Молоко смягчает эту роскошь, а на дне вас ждёт приятный сюрприз.
          </p>
        </div>

        {/* Аккордеон ДОПОЛНЕНИЯ */}
        <div className="w-[346px] mt-8 bg-[#E5E5EA]/50 rounded-[30px] overflow-hidden border border-white/40 shadow-lg">
          <button 
            onClick={() => setIsAddonsOpen(!isAddonsOpen)}
            className="w-full h-[60px] flex justify-between items-center px-6"
          >
            <span className="text-[16px] font-bold text-[#FF008C] uppercase">Дополнения</span>
            <motion.div animate={{ rotate: isAddonsOpen ? 90 : 0 }}>
              <Image src="/icons/arrow.svg" alt="v" width={20} height={20} />
            </motion.div>
          </button>

          <AnimatePresence>
            {isAddonsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-6 flex flex-col gap-4"
              >
                {/* ТИП (Холодный/Горячий) */}
                <div className="bg-white/40 rounded-[20px] p-4 border border-white/40 shadow-inner">
                  <p className="text-[14px] font-bold text-[#FF008C] uppercase mb-4">Температура</p>
                  {['Холодный', 'Горячий'].map(t => (
                    <div key={t} onClick={() => setSelectedType(t)} className="flex justify-between items-center py-2 cursor-pointer">
                      <span className={`text-[14px] font-bold uppercase ${selectedType === t ? 'text-black' : 'text-gray-400'}`}>{t}</span>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedType === t ? 'bg-[#FF008C] border-[#FF008C]' : 'border-gray-300'}`}>
                        {selectedType === t && <CheckMark />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ДОБАВКИ */}
                <div className="bg-white/40 rounded-[20px] p-4 border border-white/40 shadow-inner">
                  <p className="text-[14px] font-bold text-[#FF008C] uppercase mb-4">Основные топпинги</p>
                  
                  {/* Тапиока */}
                  <div onClick={() => { setTapiocaSelected(!tapiocaSelected); setSelectedJuiceFlavors([]); }} className="flex justify-between items-center py-2 cursor-pointer">
                    <span className={`text-[14px] font-bold uppercase ${tapiocaSelected ? 'text-black' : 'text-gray-400'}`}>Тапиока</span>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${tapiocaSelected ? 'bg-[#FF008C] border-[#FF008C]' : 'border-gray-300'}`}>
                      {tapiocaSelected && <CheckMark />}
                    </div>
                  </div>

                  {/* Сырная шапка */}
                  <div onClick={() => setCheeseSelected(!cheeseSelected)} className="flex justify-between items-center py-2 cursor-pointer border-t border-black/5 mt-2 pt-2">
                    <div className="flex flex-col">
                      <span className={`text-[14px] font-bold uppercase ${cheeseSelected ? 'text-black' : 'text-gray-400'}`}>Сырная шапка</span>
                      <span className="text-[10px] text-[#FF008C] font-bold">+ 70 ₽</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${cheeseSelected ? 'bg-[#FF008C] border-[#FF008C]' : 'border-gray-300'}`}>
                      {cheeseSelected && <CheckMark />}
                    </div>
                  </div>
                </div>

                {/* ОБЪЕМ */}
                <div className="bg-white/40 rounded-[20px] p-4 border border-white/40 shadow-inner">
                  <p className="text-[14px] font-bold text-[#FF008C] uppercase mb-4">Выберите объем</p>
                  {[{v:'M', d:'500 ml', p:0}, {v:'L', d:'700 ml', p:60}].map(vol => (
                    <div key={vol.v} onClick={() => setSelectedVolume(vol.v)} className="flex justify-between items-center py-2 cursor-pointer">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-[16px] font-bold ${selectedVolume === vol.v ? 'text-black' : 'text-gray-400'}`}>{vol.v}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{vol.d}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {vol.p > 0 && <span className="text-[10px] text-[#FF008C] font-bold">+ {vol.p} ₽</span>}
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedVolume === vol.v ? 'bg-[#FF008C] border-[#FF008C]' : 'border-gray-300'}`}>
                          {selectedVolume === vol.v && <CheckMark />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ С КНОПКОЙ */}
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
                <span className="w-8 text-center font-bold text-[18px]">{itemInCart.quantity}</span>
                <button onClick={handlePlus} className="w-10 h-10 flex items-center justify-center active:scale-90 transition-transform">
                   <Image src="/icons/plus.svg" alt="+" width={16} height={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAddToCart}
                className="bg-gradient-to-r from-[#FF00EE] to-[#FF008C] px-8 py-4 rounded-full shadow-lg shadow-pink-500/30 active:scale-95 transition-all"
              >
                <span className="text-white font-bold text-[14px] uppercase tracking-wider">В корзину</span>
              </button>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}