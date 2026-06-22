import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone } from '@/lib/coins';

// Клиент показал окно левел-апа → гасим pending, чтобы не показывать повторно
export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const phoneNorm = normalizePhone(phone || '');
    if (!phoneNorm) return NextResponse.json({ ok: true });

    await supabaseAdmin
      .from('coin_balances')
      .update({ pending_levelup_level: null, pending_levelup_coins: null })
      .eq('phone', phoneNorm);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
