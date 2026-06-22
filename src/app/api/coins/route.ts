import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone, ensureWelcomeBonus, getEffectiveCups, checkBirthdayBonus, getOrCreateRefCode } from '@/lib/coins';
import { levelForCups, COIN_REDEEM_VALUE } from '@/lib/loyaltyConfig';
import { DEFAULT_EQUIPPED } from '@/lib/cosmetics';

// Баланс коинов + ожидающий левел-ап + история. Заодно выдаёт приветственный бонус.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneRaw = searchParams.get('phone') || '';
    const phoneNorm = normalizePhone(phoneRaw);
    if (!phoneNorm) return NextResponse.json({ balance: 0, history: [], pending: null, level: 1, levelDiscount: 0, cups: 0 });

    // Приветственный бонус (один раз) + проверка подарка на ДР + личный реф-код
    await ensureWelcomeBonus(phoneNorm);
    await checkBirthdayBonus(phoneNorm);
    const refCode = await getOrCreateRefCode(phoneNorm);

    const [{ data: row }, { data: txs }, cups] = await Promise.all([
      supabaseAdmin.from('coin_balances').select('*').eq('phone', phoneNorm).single(),
      supabaseAdmin.from('coin_transactions').select('amount, type, note, order_id, created_at')
        .eq('phone', phoneNorm).order('created_at', { ascending: false }).limit(30),
      getEffectiveCups(phoneRaw, phoneNorm),
    ]);

    const lvl = levelForCups(cups);
    const pending = row?.pending_levelup_level
      ? { level: row.pending_levelup_level, coins: row.pending_levelup_coins || 0 }
      : null;
    const pendingBirthday = row?.pending_birthday_coins || null;

    return NextResponse.json({
      balance: row?.balance || 0,
      rubleValue: (row?.balance || 0) * COIN_REDEEM_VALUE,
      level: lvl.level,
      levelDiscount: lvl.discount,
      cups,
      pending,
      pendingBirthday,
      refCode,
      equipped: {
        aura: row?.equipped_aura || DEFAULT_EQUIPPED.aura,
        name: row?.equipped_name || DEFAULT_EQUIPPED.name,
        bg: row?.equipped_bg || DEFAULT_EQUIPPED.bg,
        booster: row?.equipped_booster || DEFAULT_EQUIPPED.booster,
      },
      history: txs || [],
    });
  } catch (e) {
    console.error('coins GET error', e);
    return NextResponse.json({ balance: 0, history: [], pending: null, level: 1, levelDiscount: 0, cups: 0 });
  }
}
