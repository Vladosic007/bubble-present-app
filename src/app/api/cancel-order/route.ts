import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'no orderId' }, { status: 400 });
    }

    // Проверяем что заказ реально существует и отменён (защита от спама)
    const { data: order, error } = await supabase
      .from('orders').select('id, status').eq('id', orderId).single();

    if (error || !order || order.status !== 'cancelled') {
      return NextResponse.json({ error: 'order not cancellable' }, { status: 400 });
    }

    const VK_TOKEN = process.env.VK_TOKEN!;
    const peerIds = (process.env.VK_PEER_ID || '').split(',').map(s => s.trim()).filter(Boolean);

    const cancelMessage = `❌ ЗАКАЗ #${orderId} ОТМЕНЕН КЛИЕНТОМ ❌\n\nКлиент передумал и отменил заказ. Не готовьте его!`;

    for (const peerId of peerIds) {
      const params = new URLSearchParams({
        peer_id: peerId,
        message: cancelMessage,
        random_id: (Date.now() + Math.floor(Math.random() * 100000)).toString(),
        access_token: VK_TOKEN,
        v: '5.131',
      });

      await fetch('https://api.vk.com/method/messages.send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены заказа:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
