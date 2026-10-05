import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone } from '@/lib/coins';
import { SPIN_COST_COINS } from '@/lib/wheelConfig';

// Купить прокрутку за баблкоины
export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const phoneNorm = normalizePhone(phone || '');
    if (!phoneNorm) return NextResponse.json({ error: 'no_phone' }, { status: 400 });

    // АТОМАРНО: списать коины и добавить спин одной операцией.
    // База проверит, что хватает — параллельные запросы не купят несколько спинов за одну цену.
    const { data, error } = await supabaseAdmin.rpc('wheel_buy_spin', { p_phone: phoneNorm, p_cost: SPIN_COST_COINS });
    if (error) {
      console.error('wheel_buy_spin error', error);
      return NextResponse.json({ error: 'server' }, { status: 500 });
    }
    const res = Array.isArray(data) ? data[0] : data;
    if (!res) {
      return NextResponse.json({ error: 'not_enough', need: SPIN_COST_COINS }, { status: 400 });
    }
    await supabaseAdmin.from('coin_transactions').insert({
      phone: phoneNorm, amount: -SPIN_COST_COINS, type: 'spin_buy', order_id: null, note: 'Покупка прокрутки рулетки',
    });
    return NextResponse.json({ ok: true, balance: res.balance, spins: res.spins });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
