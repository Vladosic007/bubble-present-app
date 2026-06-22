import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendBroadcast } from '@/lib/push';

const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').replace(/^8/, '7');

// Напоминание неактивным: кто не заказывал больше N дней (только босс)
export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { title, body, days } = await req.json();
    if (!title || !body) return NextResponse.json({ error: 'empty' }, { status: 400 });
    const cutoffDays = Number(days) || 14;
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;

    // Последний заказ по каждому телефону
    const { data: orders } = await supabaseAdmin
      .from('orders').select('phone, created_at, status').neq('status', 'cancelled');
    const last: Record<string, number> = {};
    for (const o of orders || []) {
      const p = normalizePhone(o.phone);
      if (!p) continue;
      const t = new Date(o.created_at).getTime();
      if (!last[p] || t > last[p]) last[p] = t;
    }
    const inactivePhones = Object.keys(last).filter(p => last[p] < cutoff);
    if (inactivePhones.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const sent = await sendBroadcast(
      { title: String(title).slice(0, 80), body: String(body).slice(0, 160), url: '/' },
      inactivePhones
    );
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
