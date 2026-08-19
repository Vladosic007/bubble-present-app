"use client";

import { useCartStore } from '../../../../store/cartStore';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';

function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return name.toLowerCase().split('').map(c => map[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AziatkaItemPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params?.slug || '');
  const { items, addItem, changeQuantity, removeItem, orderType } = useCartStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isBoss, setIsBoss] = useState<boolean | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsBoss(!!localStorage.getItem('bubble_boss_pin'));
  }, []);

  useEffect(() => {
    if (!isBoss) return;
    let cancelled = false;
    const load = async () => {
      try {
        const pin = localStorage.getItem('bubble_boss_pin') || '';
        const res = await fetch('/api/drinks?category=' + encodeURIComponent('Азиатка'), { headers: { 'x-boss-key': pin } });
        const json = await res.json();
        const found = (json.drinks || []).find((d: any) => slugify(d.name) === slug);
        if (cancelled) return;
        if (!found) { setNotFound(true); return; }
        setProduct(found);
      } catch { if (!cancelled) setNotFound(true); }
    };
    load();
    return () => { cancelled = true; };
  }, [slug, isBoss]);

  if (isBoss === null) return <div className="min-h-screen bg-[#FAFAFA]" />;
  if (!isBoss) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAFA]">
        <span className="text-[48px] mb-4">🔒</span>
        <span className="text-[14px] font-['Benzin'] uppercase text-[#8E8E93] mb-4 text-center">Раздел ещё в разработке</span>
        <button onClick={() => router.push('/')} className="h-[46px] px-[24px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95">
          На главную
        </button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <span className="text-[16px] font-['Benzin'] uppercase text-[#8E8E93] mb-4">Товар не найден 🥟</span>
        <button onClick={() => router.push('/menu/aziatka')} className="h-[46px] px-[24px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white rounded-[14px] font-['Benzin'] font-extrabold text-[12px] uppercase active:scale-95">
          К списку
        </button>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-[#FF008C] font-['Benzin'] animate-pulse uppercase text-[13px]">Загрузка...</span>
      </div>
    );
  }

  const productId = slug;
  const productName = product.name;
  const productImg = `/images/aziatka/${slug}.jpg`;
  const price = orderType === 'delivery' ? product.price_delivery : product.price_pickup;

  const cartItemId = `${productId}-item`;
  const inCart = items.find((i: any) => i.cartItemId === cartItemId);
  const qty = inCart?.quantity || 0;

  const addToCart = () => {
    if (inCart) {
      changeQuantity(cartItemId, 1);
    } else {
      addItem({
        cartItemId, id: 0,
        name: productName, price, quantity: 1,
        img: productImg, size: 'M', toppings: [],
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-[140px]">
      <div className="sticky top-0 z-40 bg-[#FAFAFA]/90 backdrop-blur-xl px-4 pt-4 pb-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shadow-sm active:scale-90">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF008C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="font-['Benzin'] font-extrabold text-[12px] uppercase text-[#333]">Азиатка</span>
        <div className="w-[40px]" />
      </div>

      <div className="w-full max-w-[400px] mx-auto px-4 mt-2">
        <div className="relative w-full aspect-square rounded-[30px] overflow-hidden shadow-[0_6px_20px_rgba(255,0,140,0.15)] bg-[#F2F2F7]">
          <Image
            draggable={false} src={productImg} alt={productName} fill className="object-cover"
            onError={(e: any) => { e.currentTarget.src = '/images/aziatka/placeholder.jpg'; }}
            priority
          />
        </div>
      </div>

      <div className="w-full max-w-[400px] mx-auto px-6 mt-6">
        <h1 className="text-[26px] leading-tight font-extrabold bg-gradient-to-r from-[#FF00EE] to-[#FF008C] bg-clip-text text-transparent uppercase mb-2">
          {productName}
        </h1>
        {product.description && (
          <p className="text-[13px] text-[#616161] leading-relaxed mt-2">{product.description}</p>
        )}
      </div>

      {isMounted && (
        <div className="fixed bottom-[100px] left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
          <div className="w-full max-w-[400px] bg-white rounded-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border border-black/5 p-[14px] flex items-center gap-[12px] pointer-events-auto">
            {qty > 0 ? (
              <>
                <div className="flex items-center gap-[10px] bg-[#F7F7F7] rounded-[16px] px-[6px] h-[48px]">
                  <button onClick={() => qty === 1 ? removeItem(cartItemId) : changeQuantity(cartItemId, -1)} className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-sm active:scale-90">
                    <span className="text-[#FF008C] text-[18px] font-bold leading-none">−</span>
                  </button>
                  <span className="font-['Benzin'] font-extrabold text-[16px] min-w-[20px] text-center">{qty}</span>
                  <button onClick={() => changeQuantity(cartItemId, 1)} className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-sm active:scale-90">
                    <span className="text-[#FF008C] text-[18px] font-bold leading-none">+</span>
                  </button>
                </div>
                <button onClick={() => router.push('/cart')} className="flex-1 h-[48px] rounded-[16px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Benzin'] font-extrabold text-[13px] uppercase active:scale-95 shadow-[0_4px_14px_rgba(255,0,140,0.35)]">
                  В корзине · {qty * price} ₽
                </button>
              </>
            ) : (
              <button onClick={addToCart} className="w-full h-[54px] rounded-[16px] bg-gradient-to-r from-[#FF00EE] to-[#FF008C] text-white font-['Benzin'] font-extrabold text-[14px] uppercase active:scale-95 shadow-[0_6px_20px_rgba(255,0,140,0.4)] flex items-center justify-center gap-[8px]">
                <span>Добавить в корзину</span>
                <span>·</span>
                <span>{price} ₽</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
