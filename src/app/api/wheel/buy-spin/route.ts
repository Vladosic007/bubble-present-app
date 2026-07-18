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

    const { data: row } = await supabaseAdmin.from('coin_balances').select('*').eq('phone', phoneNorm).single();
    if (!row || (row.balance || 0) < SPIN_COST_COINS) {
      return NextResponse.json({ error: 'not_enough', need: SPIN_COST_COINS }, { status: 400 });
    }
    const newBalance = row.balance - SPIN_COST_COINS;
    const newSpins = (row.spins || 0) + 1;
    await supabaseAdmin.from('coin_balances').update({ balance: newBalance, spins: newSpins }).eq('phone', phoneNorm);
    await supabaseAdmin.from('coin_transactions').insert({
      phone: phoneNorm, amount: -SPIN_COST_COINS, type: 'spin_buy', order_id: null, note: 'Покупка прокрутки рулетки',
    });
    return NextResponse.json({ ok: true, balance: newBalance, spins: newSpins });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
