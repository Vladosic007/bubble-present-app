import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Дата окончания акции — должна совпадать с клиентом
const OPENING_PROMO_END = new Date('2026-06-17T00:00:00+03:00');
const IS_OPENING_DAY = () => new Date() < OPENING_PROMO_END;
const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-\.,()]/g, '');

// Пересчёт суммы заказа на сервере (защита от подмены цены)
async function calcTotal(items: any[], order_type: string, promo_code: string | null): Promise<number> {
  const { data: drinks } = await supabaseAdmin.from('drinks').select('name, price_pickup, price_delivery');
  if (!drinks) return 0;

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
    if (!base) { total += (Number(it.price) || 0) * (it.qty || 1); continue; }

    let itemPrice = order_type === 'delivery' ? base.delivery : base.pickup;
    const name = (it.name || '').toLowerCase();
    if (/\(L\)/i.test(it.name || '')) itemPrice += 60;
    if (name.includes('сырн')) itemPrice += 70;
    if (name.includes('2x') || name.includes('2х')) itemPrice += 80;
    if (isOpening) itemPrice = Math.round(itemPrice / 2);
    total += itemPrice * (it.qty || 1);
  }

  if (promo_code && !isOpening) {
    const { data: promo } = await supabaseAdmin.from('promocodes').select('*')
      .eq('code', promo_code.toUpperCase()).single();
    if (promo && promo.is_active && (!promo.usage_limit || promo.used_count < promo.usage_limit)) {
      total = Math.round(total * (1 - promo.discount_percent / 100));
    }
  }
  return total;
}

export async function POST(req: Request) {
  try {
    const { customer_name, phone, address, items, order_type, order_time, isTest, promo_code } = await req.json();

    // Минимальная валидация
    if (!phone || !items || !order_type) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // ВАЖНО: цену считаем НА СЕРВЕРЕ — нельзя верить клиенту
    let itemsArr: any[] = [];
    try { itemsArr = typeof items === 'string' ? JSON.parse(items) : items; } catch {}
    const serverTotal = await calcTotal(itemsArr, order_type, promo_code || null);

    // В тестовом режиме заказ сразу "принят" (без оплаты)
    const initialStatus = isTest ? 'accepted' : 'pending_payment';

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          customer_name: customer_name || 'Гость',
          phone,
          address: address || '',
          items: typeof items === 'string' ? items : JSON.stringify(items),
          total: serverTotal,
          order_type,
          order_time: order_time || null,
          status: initialStatus,
        },
      ])
      .select();

    if (error || !data || !data[0]) {
      console.error('Ошибка создания заказа:', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    const orderId = data[0].id;

    // Тестовый заказ — сразу шлём в ВК (без оплаты)
    if (isTest) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bubblepresent.ru';
      await fetch(`${base}/api/vk-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }

    return NextResponse.json({ id: orderId, created_at: data[0].created_at, total: serverTotal });
  } catch (e) {
    console.error('Ошибка order/create:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
