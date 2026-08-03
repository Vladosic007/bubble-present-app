import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { handleOrderCompleted } from '@/lib/coins';
import { notifyOrderStatus } from '@/lib/push';
import { editForAll } from '@/lib/vkMessages';
import { buildBaristaText, buildBaristaKeyboard, buildCourierText, buildCourierKeyboard } from '@/lib/vkOrderText';

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
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    // Заказ выдан/доставлен → начисляем баблкоины + проверяем левел-ап
    if (status === 'completed') {
      await handleOrderCompleted(orderId);
    }

    // Редактируем сообщения баристам/курьерам (одно сообщение, обновляется)
    try {
      const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
      if (order) {
        const o: any = order;
        await editForAll(orderId, 'barista', buildBaristaText(o), buildBaristaKeyboard(o));
        await editForAll(orderId, 'courier', buildCourierText(o), buildCourierKeyboard(o));
      }
    } catch (e) { console.error('admin edit vk error', e); }

    // Push клиенту о смене статуса
    await notifyOrderStatus(orderId, status);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
