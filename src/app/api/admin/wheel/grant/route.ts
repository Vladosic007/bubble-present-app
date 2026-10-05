import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone } from '@/lib/coins';

// Выдать спины: конкретному клиенту или ВСЕМ.
// Только под boss-ключом.
export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { phone, all, count } = await req.json();
    const n = Math.max(1, Math.min(50, Number(count) || 1)); // страховка: 1..50

    // 1) Одному клиенту
    if (phone && !all) {
      const phoneNorm = normalizePhone(phone);
      if (!phoneNorm) return NextResponse.json({ error: 'bad_phone' }, { status: 400 });
      const { data: row } = await supabaseAdmin.from('coin_balances').select('phone').eq('phone', phoneNorm).single();
      if (!row) {
        await supabaseAdmin.from('coin_balances').insert({ phone: phoneNorm, balance: 0, spins: n });
      } else {
        await supabaseAdmin.rpc('spins_add', { p_phone: phoneNorm, p_n: n });
      }
      return NextResponse.json({ ok: true, granted: 1, spins: n });
    }

    // 2) Всем клиентам (у кого есть баланс = кто заходил в приложение)
    if (all) {
      const { data: rows } = await supabaseAdmin.from('coin_balances').select('phone');
      let updated = 0;
      for (const r of rows || []) {
        await supabaseAdmin.rpc('spins_add', { p_phone: r.phone, p_n: n });
        updated++;
      }
      return NextResponse.json({ ok: true, granted: updated, spins: n });
    }

    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  } catch (e) {
    console.error('grant spins error', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
