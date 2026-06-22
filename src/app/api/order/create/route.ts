import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isFridayDeliveryPromoActive, FRIDAY_PROMO_MULTIPLIER } from '@/lib/promoConfig';

// Дата окончания акции — должна совпадать с клиентом
const OPENING_PROMO_END = new Date('2026-06-17T00:00:00+03:00');
const IS_OPENING_DAY = () => new Date() < OPENING_PROMO_END;
const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-\.,()]/g, '');

// Пересчёт суммы заказа на сервере (защита от подмены цены)
// Возвращает { total, appliedPromo } — appliedPromo нужен для инкремента used_count
async function calcTotal(
  items: any[],
  order_type: string,
  promo_code: string | null
): Promise<{ total: number; appliedPromo: { id: string; used_count: number } | null }> {
  const { data: drinks } = await supabaseAdmin.from('drinks').select('name, category, price_pickup, price_delivery');
  if (!drinks) return { total: 0, appliedPromo: null };

  const priceMap: Record<string, { pickup: number, delivery: number, category: string }> = {};
  drinks.forEach((d: any) => {
    priceMap[normalize(d.name)] = { pickup: d.price_pickup, delivery: d.price_delivery, category: d.category };
  });

  const isOpening = IS_OPENING_DAY() && order_type === 'pickup';
  // Пятничная акция: -25% на доставку (один день). Не суммируется с промокодом.
  const isFridayDelivery = isFridayDeliveryPromoActive() && order_type === 'delivery';

  // Загружаем промокод заранее (если есть). Во время акций промокод не применяется.
  let promo: any = null;
  if (promo_code && !isOpening && !isFridayDelivery) {
    const { data } = await supabaseAdmin.from('promocodes').select('*')
      .eq('code', promo_code.toUpperCase()).single();
    if (data && data.is_active
        && (!data.usage_limit || data.used_count < data.usage_limit)
        && (!data.valid_until || new Date(data.valid_until) >= new Date())) {
      promo = data;
    }
  }

  let total = 0;
  let promoWasApplied = false;
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
    else if (isFridayDelivery) itemPrice = Math.round(itemPrice * FRIDAY_PROMO_MULTIPLIER);

    // Применение промокода к этой позиции (если подходит)
    if (promo) {
      const apply = !promo.applies_to || promoMatchesItem(promo.applies_to, it.slug || it.id, base.category, cleanName);
      if (apply) {
        itemPrice = Math.round(itemPrice * (1 - promo.discount_percent / 100));
        promoWasApplied = true;
      }
    }

    total += itemPrice * (it.qty || 1);
  }

  return {
    total,
    appliedPromo: promo && promoWasApplied ? { id: promo.id, used_count: promo.used_count || 0 } : null,
  };
}

function promoMatchesItem(appliesTo: string, slug: string | undefined, category: string | undefined, cleanName: string): boolean {
  if (!appliesTo) return true;
  if (appliesTo.startsWith('drink:')) {
    const wantedSlug = appliesTo.slice(6).toLowerCase();
    // На клиенте slug не всегда есть — сверяем ещё и по cleanName
    return (slug || '').toLowerCase() === wantedSlug || cleanName.includes(wantedSlug);
  }
  if (appliesTo.startsWith('category:')) {
    return (category || '').toLowerCase() === appliesTo.slice(9).toLowerCase();
  }
  return false;
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
    const { total: serverTotal, appliedPromo } = await calcTotal(itemsArr, order_type, promo_code || null);

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
          vk_notified: isTest ? true : false,
        },
      ])
      .select();

    if (error || !data || !data[0]) {
      console.error('Ошибка создания заказа:', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    const orderId = data[0].id;

    // Инкрементируем счётчик использований промокода (если был применён)
    if (appliedPromo) {
      try {
        await supabaseAdmin
          .from('promocodes')
          .update({ used_count: appliedPromo.used_count + 1 })
          .eq('id', appliedPromo.id);
      } catch (e) {
        console.error('Не удалось обновить used_count промокода:', e);
      }
    }

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
