import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone, ensureWelcomeSpins } from '@/lib/coins';
import { SPIN_COST_COINS } from '@/lib/wheelConfig';

// Состояние рулетки для клиента: баланс спинов + баланс коинов + мои промокоды
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneRaw = searchParams.get('phone') || '';
    const phoneNorm = normalizePhone(phoneRaw);
    if (!phoneNorm) return NextResponse.json({ spins: 0, balance: 0, myPromos: [] });

    await ensureWelcomeSpins(phoneNorm); // приветственные 3 спина (один раз)

    const [{ data: bal }, { data: promos }] = await Promise.all([
      supabaseAdmin.from('coin_balances').select('spins, balance').eq('phone', phoneNorm).single(),
      supabaseAdmin.from('promocodes').select('code, discount_percent, applies_to, valid_until, used_count, usage_limit')
        .eq('owner_phone', phoneNorm).order('created_at', { ascending: false }),
    ]);

    // Отсекаем: истёкшие и уже использованные
    const now = Date.now();
    const active = (promos || []).filter((p: any) => {
      if (p.usage_limit && p.used_count >= p.usage_limit) return false;
      if (p.valid_until && new Date(p.valid_until).getTime() < now) return false;
      return true;
    });

    return NextResponse.json({
      spins: bal?.spins || 0,
      balance: bal?.balance || 0,
      spinCost: SPIN_COST_COINS,
      myPromos: active,
    });
  } catch {
    return NextResponse.json({ spins: 0, balance: 0, myPromos: [] });
  }
}
