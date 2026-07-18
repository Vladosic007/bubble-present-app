import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isFridayDeliveryPromoActive, FRIDAY_PROMO_MULTIPLIER } from '@/lib/promoConfig';
import { levelForCups, COIN_MAX_REDEEM_FRACTION, COIN_REDEEM_VALUE, TOTAL_DISCOUNT_CAP_FRACTION } from '@/lib/loyaltyConfig';
import { getEffectiveCups, getBalance, normalizePhone, redeemForOrder, setReferredBy } from '@/lib/coins';

// Дата окончания акции — должна совпадать с клиентом
const OPENING_PROMO_END = new Date('2026-06-17T00:00:00+03:00');
const IS_OPENING_DAY = () => new Date() < OPENING_PROMO_END;
const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-\.,()]/g, '');

type CalcResult = {
  total: number;
  appliedPromo: { id: string; used_count: number } | null;
  levelDiscount: number; // %
  coinsUsed: number;     // сколько коинов реально списано
};

// Пересчёт суммы заказа на сервере (защита от подмены цены).
// Учитывает: акции (открытие/пятница), промокод, уровневую скидку, списание коинов.
async function calcTotal(
  items: any[],
  order_type: string,
  promo_code: string | null,
  phone: string | null,
  redeemCoinsRequested: number
): Promise<CalcResult> {
  const empty: CalcResult = { total: 0, appliedPromo: null, levelDiscount: 0, coinsUsed: 0 };
  const { data: drinks } = await supabaseAdmin.from('drinks').select('name, category, price_pickup, price_delivery');
  if (!drinks) return empty;

  const priceMap: Record<string, { pickup: number, delivery: number, category: string }> = {};
  drinks.forEach((d: any) => {
    priceMap[normalize(d.name)] = { pickup: d.price_pickup, delivery: d.price_delivery, category: d.category };
  });

  const isOpening = IS_OPENING_DAY() && order_type === 'pickup';
  // Пятничная акция: -25% на доставку (один день). Не суммируется с промокодом.
  const isFridayDelivery = isFridayDeliveryPromoActive() && order_type === 'delivery';
  const isBigPromo = isOpening || isFridayDelivery;

  // Загружаем промокод заранее (если есть). Во время акций промокод не применяется.
  let promo: any = null;
  if (promo_code && !isBigPromo) {
    const { data } = await supabaseAdmin.from('promocodes').select('*')
      .eq('code', promo_code.toUpperCase()).single();
    // Персональные коды (owner_phone) — только владельцу
    const phoneNorm = phone ? normalizePhone(phone) : '';
    if (data && data.is_active
        && (!data.usage_limit || data.used_count < data.usage_limit)
        && (!data.valid_until || new Date(data.valid_until) >= new Date())
        && (!data.owner_phone || data.owner_phone === phoneNorm)) {
      promo = data;
    }
  }

  let fullTotal = 0;   // без скидок — для потолка 50%
  let subtotal = 0;    // с акциями и промокодом
  let promoWasApplied = false;
  for (const it of items) {
    const cleanName = normalize((it.name || '').replace(/\s*\(.+/, ''));
    let base = priceMap[cleanName];
    if (!base) {
      const foundKey = Object.keys(priceMap).find(k => k.includes(cleanName) || cleanName.includes(k));
      if (foundKey) base = priceMap[foundKey];
    }
    if (!base) {
      const fb = (Number(it.price) || 0) * (it.qty || 1);
      fullTotal += fb; subtotal += fb; continue;
    }

    let itemFull = order_type === 'delivery' ? base.delivery : base.pickup;
    const name = (it.name || '').toLowerCase();
    if (/\(L\)/i.test(it.name || '')) itemFull += 60;
    if (name.includes('сырн')) itemFull += 70;
    if (name.includes('2x') || name.includes('2х')) itemFull += 80;
    fullTotal += itemFull * (it.qty || 1);

    let itemPrice = itemFull;
    if (isOpening) itemPrice = Math.round(itemFull / 2);
    else if (isFridayDelivery) itemPrice = Math.round(itemFull * FRIDAY_PROMO_MULTIPLIER);

    // Промокод к позиции (если подходит)
    if (promo) {
      const apply = !promo.applies_to || promoMatchesItem(promo.applies_to, it.slug || it.id, base.category, cleanName);
      if (apply) {
        itemPrice = Math.round(itemPrice * (1 - promo.discount_percent / 100));
        promoWasApplied = true;
      }
    }

    subtotal += itemPrice * (it.qty || 1);
  }

  const appliedPromo = promo && promoWasApplied ? { id: promo.id, used_count: promo.used_count || 0 } : null;

  // Во время больших акций — ничего больше не стэкаем
  if (isBigPromo) {
    return { total: subtotal, appliedPromo, levelDiscount: 0, coinsUsed: 0 };
  }

  // Уровневая скидка (всегда, по числу выпитых напитков с учётом бустера)
  let levelDiscount = 0;
  if (phone) {
    const cups = await getEffectiveCups(phone, normalizePhone(phone));
    levelDiscount = levelForCups(cups).discount;
  }
  const afterLevel = Math.round(subtotal * (1 - levelDiscount / 100));

  // Коины — только если промокод НЕ применён (правило: промокод ИЛИ коины)
  let coinsUsed = 0;
  if (!promoWasApplied && redeemCoinsRequested > 0 && phone) {
    const balance = await getBalance(normalizePhone(phone));
    const minAllowed = Math.ceil(fullTotal * (1 - TOTAL_DISCOUNT_CAP_FRACTION)); // нельзя ниже 50% от полной цены
    const capByGlobal = Math.max(0, afterLevel - minAllowed);
    const capByOrder = Math.floor((afterLevel * COIN_MAX_REDEEM_FRACTION) / COIN_REDEEM_VALUE); // коины ≤ 50% заказа
    coinsUsed = Math.max(0, Math.min(balance, Math.floor(redeemCoinsRequested), capByGlobal, capByOrder));
  }

  const total = afterLevel - coinsUsed * COIN_REDEEM_VALUE;
  return { total, appliedPromo, levelDiscount, coinsUsed };
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
    const { customer_name, phone, address, items, order_type, order_time, isTest, promo_code, source, redeem_coins, referred_by, boss_key, client_token } = await req.json();

    // Минимальная валидация
    if (!phone || !items || !order_type) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // 🛡 ЗАЩИТА ОТ ДУБЛЕЙ: если пришёл client_token и заказ с ним уже есть — вернём его.
    // Это нужно, чтобы обновление страницы или повторный тап "Оплатить" не плодили призраков.
    const cleanToken = (typeof client_token === 'string' && /^[a-z0-9\-]{8,64}$/i.test(client_token))
      ? client_token
      : null;
    if (cleanToken) {
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id, created_at, total, status')
        .eq('client_token', cleanToken)
        .limit(1);
      if (existing && existing[0]) {
        const e = existing[0];
        // Если старый заказ уже отменён — не переиспользуем (клиент отменил, нужен новый)
        if (e.status !== 'cancelled') {
          return NextResponse.json({
            id: e.id, created_at: e.created_at, total: e.total,
            coinsUsed: 0, isTest: false, reused: true,
          });
        }
      }
    }

    // 🔒 ТЕСТОВЫЙ РЕЖИМ (заказ без оплаты) — ТОЛЬКО для владельца с верным boss-ключом.
    // Раньше любой клиент с именем "ТЕСТ" мог сделать бесплатный заказ — это закрыто.
    const reallyTest = !!isTest && !!boss_key && boss_key === process.env.BOSS_PASSWORD;

    // === ЖЁСТКАЯ ВАЛИДАЦИЯ ИМЕНИ И ТЕЛЕФОНА (сервер, не подделать) ===
    const nameRaw = (customer_name || '').trim();
    const nameUpper = nameRaw.toUpperCase();
    // Разрешаем "ТЕСТ" (это режим), иначе — минимум 2 буквы кириллицей и без мусора
    if (nameUpper !== 'ТЕСТ' && !isTest) {
      const cyrOnly = /^[А-Яа-яЁё\s\-]{2,30}$/;
      const gibberish = /[бвгджзклмнпрстфхцчшщ]{4,}/i;
      const mat = /(х[уy](й|и|я|е|ё)|пизд|еб[аоуеы]|бля|шлюх|хуел|залуп|дроч|гондон|пидр|еблан)/i;
      // Нужно минимум 2 разных буквы (отсеивает "аа", "ыы", "фф")
      const uniqueLetters = new Set(nameRaw.toLowerCase().replace(/[^а-яё]/g, '').split(''));
      if (!cyrOnly.test(nameRaw)) {
        return NextResponse.json({ error: 'bad_name', message: 'Введи нормальное имя кириллицей (минимум 2 буквы)' }, { status: 400 });
      }
      if (uniqueLetters.size < 2) {
        return NextResponse.json({ error: 'bad_name', message: 'Имя слишком короткое или однотипное' }, { status: 400 });
      }
      if (gibberish.test(nameRaw) || mat.test(nameRaw)) {
        return NextResponse.json({ error: 'bad_name', message: 'Имя содержит мат или бессмыслицу' }, { status: 400 });
      }
    }
    // Телефон: 10 цифр после +7/8, и не должен быть "99999..." и подобной дичью
    const cleanPhone = String(phone).replace(/\D/g, '').replace(/^8/, '7');
    if (!/^7\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'bad_phone', message: 'Введи корректный российский номер' }, { status: 400 });
    }
    // Все одинаковые цифры (99999999998 и т.п.) — фейк
    const last10 = cleanPhone.slice(1);
    const uniqueDigits = new Set(last10.split(''));
    if (uniqueDigits.size <= 2) {
      return NextResponse.json({ error: 'bad_phone', message: 'Введи реальный номер телефона' }, { status: 400 });
    }

    // Источник трафика (откуда пришёл клиент). Чистим и ограничиваем длину.
    const cleanSource = (source && typeof source === 'string')
      ? source.toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 40) || 'direct'
      : 'direct';

    // ВАЖНО: цену считаем НА СЕРВЕРЕ — нельзя верить клиенту
    let itemsArr: any[] = [];
    try { itemsArr = typeof items === 'string' ? JSON.parse(items) : items; } catch {}
    const requestedCoins = Math.max(0, Math.floor(Number(redeem_coins) || 0));
    const { total: serverTotal, appliedPromo, coinsUsed, levelDiscount } = await calcTotal(
      itemsArr, order_type, promo_code || null, phone, requestedCoins
    );

    // В тестовом режиме заказ сразу "принят" (без оплаты) — только для владельца
    const initialStatus = reallyTest ? 'accepted' : 'pending_payment';

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
          vk_notified: reallyTest ? true : false,
          source: cleanSource,
          coins_used: coinsUsed,
          level_discount: levelDiscount,
          client_token: cleanToken,
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

    // Списываем коины (если были применены и реально уменьшили цену)
    if (coinsUsed > 0) {
      try {
        await redeemForOrder(normalizePhone(phone), coinsUsed, orderId);
      } catch (e) {
        console.error('Не удалось списать коины:', e);
      }
    }

    // Привязка к пригласившему (если пришёл по реф-ссылке) — награда выдастся при завершении
    if (referred_by && typeof referred_by === 'string') {
      try {
        await setReferredBy(normalizePhone(phone), referred_by.trim());
      } catch (e) {
        console.error('Не удалось привязать реферала:', e);
      }
    }

    // Тестовый заказ — сразу шлём в ВК (без оплаты). Только для владельца.
    if (reallyTest) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bubblepresent.ru';
      await fetch(`${base}/api/vk-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }

    return NextResponse.json({ id: orderId, created_at: data[0].created_at, total: serverTotal, coinsUsed, isTest: reallyTest });
  } catch (e) {
    console.error('Ошибка order/create:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
