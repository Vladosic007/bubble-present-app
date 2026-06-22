import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { handleOrderCompleted } from '@/lib/coins';

export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-admin-key');
    if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    // Заказ выдан/доставлен → начисляем баблкоины + проверяем левел-ап
    if (status === 'completed') {
      await handleOrderCompleted(orderId);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
