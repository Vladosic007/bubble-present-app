import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone } from '@/lib/coins';
import { WHEEL_SECTORS, pickSector, PROMO_LIFETIME_DAYS } from '@/lib/wheelConfig';

// Прокрутить рулетку. Всё серверно: списываем спин, разыгрываем, выдаём приз.
export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const phoneNorm = normalizePhone(phone || '');
    if (!phoneNorm) return NextResponse.json({ error: 'no_phone' }, { status: 400 });

    // Читаем/создаём баланс
    const { data: existing } = await supabaseAdmin.from('coin_balances').select('*').eq('phone', phoneNorm).single();
    let row: any = existing;
    if (!row) {
      const { data: created } = await supabaseAdmin
        .from('coin_balances').insert({ phone: phoneNorm, balance: 0, spins: 0 }).select().single();
      row = created;
    }
    if ((row?.spins || 0) < 1) {
      return NextResponse.json({ error: 'no_spins' }, { status: 400 });
    }

    // Списываем 1 спин
    const newSpins = (row.spins || 0) - 1;
    await supabaseAdmin.from('coin_balances').update({ spins: newSpins }).eq('phone', phoneNorm);

    // Разыгрываем сектор
    const idx = pickSector();
    const sector = WHEEL_SECTORS[idx];

    // Обработка приза
    let addedCoins = 0;
    let refundSpin = false;
    let promoCode: string | null = null;
    let validUntilISO: string | null = null;

    if (sector.type === 'coins') {
      addedCoins = sector.amount;
      const newBalance = (row.balance || 0) + addedCoins;
      await supabaseAdmin.from('coin_balances').update({ balance: newBalance }).eq('phone', phoneNorm);
      await supabaseAdmin.from('coin_transactions').insert({
        phone: phoneNorm, amount: addedCoins, type: 'wheel', order_id: null, note: `Рулетка: +${addedCoins} коинов`,
      });
    } else if (sector.type === 'respin') {
      // Возвращаем спин обратно (бесплатный повторный)
      refundSpin = true;
      await supabaseAdmin.from('coin_balances').update({ spins: newSpins + 1 }).eq('phone', phoneNorm);
    } else if (sector.type === 'promo') {
      // Генерим уникальный персональный код
      const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
      promoCode = `WHEEL-${rand}`;
      const validUntil = new Date(Date.now() + PROMO_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
      validUntilISO = validUntil.toISOString();
      await supabaseAdmin.from('promocodes').insert({
        code: promoCode,
        discount_percent: sector.discount,
        applies_to: `category:${sector.category}`,
        usage_limit: 1,
        used_count: 0,
        is_active: true,
        valid_until: validUntilISO,
        owner_phone: phoneNorm,
      });
    }

    return NextResponse.json({
      ok: true,
      sectorIndex: idx,
      sector: {
        type: sector.type,
        label: sector.label,
        emoji: sector.emoji,
        ...(sector.type === 'promo' ? { code: promoCode, validUntil: validUntilISO, discount: sector.discount, category: sector.category } : {}),
        ...(sector.type === 'coins' ? { amount: addedCoins } : {}),
        ...(sector.type === 'respin' ? { refunded: refundSpin } : {}),
      },
      spinsLeft: refundSpin ? newSpins + 1 : newSpins,
    });
  } catch (e) {
    console.error('wheel spin error', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
