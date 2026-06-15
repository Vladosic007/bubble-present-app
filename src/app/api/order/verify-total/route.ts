import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Дата окончания акции — должна совпадать с клиентом
const OPENING_PROMO_END = new Date('2026-06-17T00:00:00+03:00');
const IS_OPENING_DAY = () => new Date() < OPENING_PROMO_END;

const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-\.,()]/g, '');

// Пересчитывает сумму заказа на сервере по ценам из базы
export async function POST(req: Request) {
  try {
    const { items, order_type, promo_code } = await req.json();
    if (!Array.isArray(items) || !order_type) {
      return NextResponse.json({ error: 'bad input' }, { status: 400 });
    }

    // Тянем цены напитков из базы
    const { data: drinks, error } = await supabaseAdmin
      .from('drinks').select('name, price_pickup, price_delivery');
    if (error || !drinks) return NextResponse.json({ error: 'db' }, { status: 500 });

    const priceMap: Record<string, { pickup: number, delivery: number }> = {};
    drinks.forEach((d: any) => {
      priceMap[normalize(d.name)] = { pickup: d.price_pickup, delivery: d.price_delivery };
    });

    const isOpening = IS_OPENING_DAY() && order_type === 'pickup';

    let total = 0;
    for (const it of items) {
      const cleanName = normalize((it.name || '').replace(/\s*\(.+/, ''));
      let base = priceMap[cleanName];
      if (!base) {
        const foundKey = Object.keys(priceMap).find(k => k.includes(cleanName) || cleanName.includes(k));
        if (foundKey) base = priceMap[foundKey];
      }
      if (!base) {
        // Если напиток не нашли в базе — используем переданную цену как fallback
        total += (Number(it.price) || 0) * (it.qty || 1);
        continue;
      }

      let itemPrice = order_type === 'delivery' ? base.delivery : base.pickup;
      const sizeMatch = (it.name || '').match(/\(L\)/i);
      if (sizeMatch) itemPrice += 60;

      // Топпинги — парсим из названия
      const name = (it.name || '').toLowerCase();
      if (name.includes('сырн')) itemPrice += 70;
      if (name.includes('2x') || name.includes('2х')) itemPrice += 80;

      if (isOpening) itemPrice = Math.round(itemPrice / 2);

      total += itemPrice * (it.qty || 1);
    }

    // Применяем промокод (если есть и не блокируется акцией)
    if (promo_code && !isOpening) {
      const { data: promo } = await supabaseAdmin
        .from('promocodes').select('*')
        .eq('code', promo_code.toUpperCase()).single();

      if (promo && promo.is_active && (!promo.usage_limit || promo.used_count < promo.usage_limit)) {
        total = Math.round(total * (1 - promo.discount_percent / 100));
      }
    }

    return NextResponse.json({ total });
  } catch (e) {
    console.error('verify-total error:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
