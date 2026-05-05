"use client";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// Функция для подбора цвета кнопки статуса
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'отмена': return 'bg-gradient-to-r from-[#E3000F] to-[#B3000C]'; 
    case 'доставлен': 
    case 'выдан': return 'bg-gradient-to-r from-[#14FF00] to-[#0DAA00]'; 
    case 'готовится': return 'bg-gradient-to-r from-[#FFB800] to-[#E6A600]'; 
    case 'едет': 
    case 'ждет выдачи': return 'bg-gradient-to-r from-[#0088CC] to-[#0055FF]'; 
    case 'оформлен': return 'bg-gradient-to-r from-[#333333] to-[#555555]';
    default: return 'bg-gray-500';
  }
};

// Функция подбора картинки по названию
// ❗ ВАЖНО: Проверь, чтобы все эти файлы реально лежали в папке public/images/ ❗
const getImageByName = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('нутелла')) return '/images/nutella1.jpg'; 
  if (n.includes('орео')) return '/images/oreo1.jpg'; 
  if (n.includes('бабл милк ти')) return '/images/bubble-milk-tea.jpg'; 
  if (n.includes('тайское караоке')) return '/images/caraoke1.jpg'; 
  if (n.includes('гранат кокос')) return '/images/pomegranate1.jpg'; 
  if (n.includes('чоко банан')) return '/images/choko-banana.jpg'; 
  if (n.includes('таро')) return '/images/taro1.jpg'; 
  if (n.includes('малиновое облако')) return '/images/rasp-cloud1.jpg'; 
  if (n.includes('красная смородина')) return '/images/red-currant1.jpg'; 
  if (n.includes('жасминовая малина')) return '/images/jasmine-rasp1.jpg'; 
  if (n.includes('жасминовая клубника')) return '/images/jasmine-straw1.jpg'; 
  if (n.includes('маракуйя с содовой')) return '/images/passion-soda1.jpg'; 
  if (n.includes('рэд драгон')) return '/images/red-dragon1.jpg'; 
  if (n.includes('тай лун')) return '/images/tai-lung1.jpg'; 
  if (n.includes('облепиховая пряность')) return '/images/sea-buckthorn1.jpg'; 
  if (n.includes('тайский с апельсином')) return '/images/thai-orange1.jpg'; 
  if (n.includes('вельвет')) return '/images/velvet1.jpg';  
  if (n.includes('чизкейк')) return '/images/cheesecake1.jpg'; 
  if (n.includes('взрывная карамель')) return '/images/exploding-caramel1.jpg'; 
  if (n.includes('халва')) return '/images/halva1.jpg'; 
  if (n.includes('красотка в розовом')) return '/images/pretty-in-pink1.jpg'; 
  if (n.includes('рот фронт')) return '/images/rot-front1.jpg';  
  if (n.includes('тоффи бум')) return '/images/toffee-boom1.jpg';  
  if (n.includes('сырный раф')) return '/images/cheese-raf1.jpg';  
  if (n.includes('сникерс')) return '/images/snickers1.jpg'; 
  if (n.includes('клубника-базилик')) return '/images/straw-basil1.jpg'; 
  if (n.includes('дубайский')) return '/images/dubai1.jpg'; 
  if (n.includes('бамбл')) return '/images/bumble.jpg'; 
  if (n.includes('изумрудный бриз')) return '/images/emerald-breeze1.jpg'; 
  if (n.includes('карамельная малина')) return '/images/caramel-rasp1.jpg'; 
  if (n.includes('райзсан')) return '/images/raiesan1.jpg'; 
  if (n.includes('банановый')) return '/images/banana-lim1.jpg'; 
  if (n.includes('щавелевый')) return '/images/sorrel1.jpg'; 
  if (n.includes('мохито')) return '/images/mojito1.jpg'; 
  if (n.includes('матча с малиной')) return '/images/matcha-raspberry1.jpg'; 
  if (n.includes('матча с фисташкой')) return '/images/matcha-pistachio1.jpg'; 
  if (n.includes('розовая сакура')) return '/images/pink-sakura1.jpg';  
  if (n.includes('молочная черника')) return '/images/blueberry1.jpg'; 
  if (n.includes('чоко клубника')) return '/images/choco-straw1.jpg'; 
  if (n.includes('морозная черника')) return '/images/frost-blueberry1.jpg'; 
  if (n.includes('цитрус')) return '/images/citrus1.jpg'; 
  if (n.includes('жасминовый лайм')) return '/images/jasmine-lime1.jpg'; 
  if (n.includes('жасминовый киви')) return '/images/jasmine-kiwi1.jpg'; 
  if (n.includes('лесной морс')) return '/images/forest-berries1.jpg'; 
  if (n.includes('ягодный микс')) return '/images/berry-mix1.jpg';
  if (n.includes('Чоко-банан')) return '/images/choco-banana1.jpg';
  return '/images/bubblik.png'; 
};

export default function HistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const phone = localStorage.getItem('bubble_user_phone');
      if (!phone) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false });

      if (data && !error) {
        // ❗ ЖЕСТКИЙ ФИЛЬТР: УБИРАЕМ ВСЕ ОТМЕНЕННЫЕ ЗАКАЗЫ ИЗ СПИСКА ❗
        const activeData = data.filter((order: any) => order.status !== 'cancelled');

        const formattedOrders = activeData.map((order: any) => {
          let itemsArr: any[] = [];
          try { itemsArr = JSON.parse(order.items); } catch(e){}

          // Считаем стаканчики
          const count = itemsArr.reduce((acc, curr) => acc + curr.qty, 0);

          // Переводим системные статусы в русские
          let uiStatus = 'Готовится';
          if (order.status === 'cancelled') uiStatus = 'Отмена';
          else if (order.status === 'completed') uiStatus = order.order_type === 'delivery' ? 'Доставлен' : 'Выдан';
          else if (['ready_for_courier', 'delivering'].includes(order.status)) uiStatus = 'Едет';
          else if (order.status === 'ready_for_pickup') uiStatus = 'Ждет выдачи';
          else if (order.status === 'accepted') uiStatus = 'Оформлен';

          // ❗ УМНЫЙ ПОДБОР КАРТИНОК: дублируем картинку, если qty > 1 ❗
          const images: string[] = [];
          itemsArr.forEach(item => {
            const imgPath = getImageByName(item.name);
            for (let i = 0; i < item.qty; i++) {
              images.push(imgPath);
            }
          });

          return {
            id: order.id.toString(),
            date: new Date(order.created_at).toLocaleDateString('ru-RU'),
            count,
            total: order.total,
            status: uiStatus,
            images: images.length > 0 ? images : ['/images/bubblik.png']
          };
        });

        setOrders(formattedOrders);
      }
      setIsLoading(false);
    };

    fetchHistory();
  }, []);

  return (
    <div className="fixed inset-0 bg-[#F2F2F7] overflow-hidden font-sans flex justify-center z-0">
      
      {/* АНИМАЦИЯ НА ЗАДНИЙ ФОН */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none w-full h-full">
        {[...Array(12)].map((_, i) => {
          const size = Math.random() * 30 + 15; 
          return (
            <motion.div
              key={i}
              className="absolute bottom-[-50px]"
              style={{ width: size, height: size, left: `${Math.random() * 100}%` }}
              animate={{ 
                y: ['0vh', '-120vh'], 
                x: [0, Math.random() * 60 - 30, 0],
                rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)] 
              }}
              transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
            >
              <Image src="/images/small-bubblik.png" alt="Летающий Баблик" fill className="object-contain opacity-30" />
            </motion.div>
          );
        })}
      </div>

      <main className="relative w-full max-w-[402px] h-full bg-transparent overflow-y-auto no-scrollbar flex flex-col items-center pb-[120px] z-10 mx-auto">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full pb-[150px]">
            <span className="text-[#FF008C] font-benzin font-medium animate-pulse">Загрузка истории...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full pb-[150px]">
            <div className="relative w-[214px] h-[310px] shrink-0 pointer-events-none opacity-50">
              <Image src="/images/bubblik.png" alt="Пустая история" fill className="object-contain" priority />
            </div>
            <p className="mt-[32px] px-[46px] text-center text-[#000000]/40 font-benzin font-medium text-[12px] tracking-[0.02em] uppercase">
              Вы еще не заказывали бабл-ти.<br/>Самое время это исправить!
            </p>
          </div>
        ) : (
          <section className="w-full flex flex-col items-center gap-[32px] pt-[20px]">
            {orders.map(order => (
              <article key={order.id} className="relative w-[342px] h-[195px] rounded-[25px] bg-[#FFFFFF]/20 backdrop-blur-[30px] shrink-0 box-border"
                style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4), 0px 5px 5.7px 4px rgba(8, 0, 255, 0.25)' }}>
                
                {/* ❗ ИДЕАЛЬНАЯ СЕТКА КАРТИНОК ❗ */}
                <div className="absolute left-[16px] top-[16px] w-[163px] h-[163px] rounded-[25px] bg-white/10 shadow-[0_1px_4px_1px_rgba(0,0,0,0.1)] overflow-hidden flex flex-wrap">
                  
                  {order.count === 1 && (
                    <div className="relative w-full h-full">
                      <Image src={order.images[0]} fill className="object-cover" alt="drink 1"/>
                    </div>
                  )}

                  {order.count === 2 && (
                    <>
                      <div className="relative w-1/2 h-full border-r border-white/20"><Image src={order.images[0]} fill className="object-cover" alt="drink 1"/></div>
                      <div className="relative w-1/2 h-full"><Image src={order.images[1]} fill className="object-cover" alt="drink 2"/></div>
                    </>
                  )}

                  {order.count === 3 && (
                    <>
                      <div className="relative w-1/2 h-full border-r border-white/20"><Image src={order.images[0]} fill className="object-cover" alt="drink 1"/></div>
                      <div className="relative w-1/2 h-full flex flex-col">
                        <div className="relative w-full h-1/2 border-b border-white/20"><Image src={order.images[1]} fill className="object-cover" alt="drink 2"/></div>
                        <div className="relative w-full h-1/2"><Image src={order.images[2]} fill className="object-cover" alt="drink 3"/></div>
                      </div>
                    </>
                  )}

                  {order.count >= 4 && (
                    <>
                      <div className="relative w-1/2 h-1/2 border-r border-b border-white/20"><Image src={order.images[0]} fill className="object-cover" alt="drink 1"/></div>
                      <div className="relative w-1/2 h-1/2 border-b border-white/20"><Image src={order.images[1]} fill className="object-cover" alt="drink 2"/></div>
                      <div className="relative w-1/2 h-1/2 border-r border-white/20"><Image src={order.images[2]} fill className="object-cover" alt="drink 3"/></div>
                      <div className="relative w-1/2 h-1/2">
                        <Image src={order.images[3]} fill className="object-cover" alt="drink 4"/>
                        {order.count > 4 && (
                          <div className="absolute inset-0 bg-[#000000]/60 flex items-center justify-center z-10 backdrop-blur-sm">
                            <span className="font-['Benzin-ExtraBold'] text-[24px] text-white drop-shadow-md">
                              +{order.count - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>

                <div className="absolute left-[187px] top-[16px] flex flex-col gap-[8px]">
                  <span className="font-benzin font-medium text-[10px] tracking-[0.02em] text-[#616161] uppercase">Заказ {order.id}</span>
                  <span className="font-benzin font-medium text-[10px] tracking-[0.02em] text-[#616161] uppercase">{order.date}</span>
                  <span className="font-benzin font-medium text-[10px] tracking-[0.02em] text-[#616161] uppercase">{order.count} напитка</span>
                  <span className="font-benzin font-medium text-[10px] tracking-[0.02em] text-[#616161] uppercase">Итого: {order.total} руб</span>
                </div>

                <div className={`absolute left-[187px] bottom-[16px] w-[121px] h-[22px] rounded-[15px] flex items-center justify-center shadow-sm ${getStatusColor(order.status)}`}>
                  <span className="font-benzin font-medium text-[10px] tracking-[0.02em] text-[#FFFFFF] uppercase drop-shadow-sm">
                    {order.status}
                  </span>
                </div>

              </article>
            ))}
          </section>
        )}

      </main>
    </div>
  );
}