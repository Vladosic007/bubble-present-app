import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { clientIp, isBlocked, recordFailure, clearFailures } from '@/lib/rateLimit';

export async function GET(req: Request) {
  try {
    const ip = 'admin:' + clientIp(req);
    if (isBlocked(ip)) {
      return NextResponse.json({ error: 'too_many' }, { status: 429 });
    }
    const key = req.headers.get('x-admin-key');
    if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
      recordFailure(ip);
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    clearFailures(ip);

    // Скрываем "брошенные" неоплаченные заказы (pending_payment),
    // чтобы баристы не видели мусор. Показываем только реальные.
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
