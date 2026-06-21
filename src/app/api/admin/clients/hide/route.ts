import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').replace(/^8/, '7');

// Скрыть / вернуть клиента (сотрудника или тест) из базы CRM
export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { phone, action, note } = await req.json();
    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) return NextResponse.json({ error: 'no phone' }, { status: 400 });

    if (action === 'unhide') {
      const { error } = await supabaseAdmin
        .from('hidden_clients')
        .delete()
        .eq('phone', phoneNorm);
      if (error) return NextResponse.json({ error: 'db error' }, { status: 500 });
      return NextResponse.json({ success: true, action: 'unhidden' });
    }

    // По умолчанию — скрыть (upsert чтобы не плодить дубли)
    const { error } = await supabaseAdmin
      .from('hidden_clients')
      .upsert({ phone: phoneNorm, note: note || '' }, { onConflict: 'phone' });
    if (error) return NextResponse.json({ error: 'db error' }, { status: 500 });
    return NextResponse.json({ success: true, action: 'hidden' });
  } catch (e) {
    console.error('clients/hide error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
