import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { customer_name, phone, address, items, total, order_type, order_time, isTest } = await req.json();

    // Минимальная валидация
    if (!phone || !items || !order_type) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // В тестовом режиме заказ сразу "принят" (без оплаты)
    const initialStatus = isTest ? 'accepted' : 'pending_payment';

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          customer_name: customer_name || 'Гость',
          phone,
          address: address || '',
          items,
          total,
          order_type,
          order_time: order_time || null,
          status: initialStatus,
        },
      ])
      .select();

    if (error || !data || !data[0]) {
      console.error('Ошибка создания заказа:', error);
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    const orderId = data[0].id;

    // Тестовый заказ — сразу шлём в ВК (без оплаты)
    if (isTest) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bubblepresent.ru';
      await fetch(`${base}/api/vk-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }

    return NextResponse.json({ id: orderId, created_at: data[0].created_at });
  } catch (e) {
    console.error('Ошибка order/create:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
