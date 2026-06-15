import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'no orderId' }, { status: 400 });
    }

    const VK_TOKEN = process.env.VK_TOKEN!;
    const peerIds = (process.env.VK_PEER_ID || '').split(',').map(s => s.trim()).filter(Boolean);

    // Берём заказ ИЗ БАЗЫ (а не из тела запроса) — защита от подделки
    const { data: order, error } = await supabase
      .from('orders').select('*').eq('id', orderId).single();

    if (error || !order) {
      return NextResponse.json({ error: 'order not found' }, { status: 404 });
    }

    // Формируем текст заказа из данных базы
    let itemsText = '';
    try {
      const parsed = JSON.parse(order.items);
      itemsText = parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
    } catch {
      itemsText = order.items;
    }

    const isDelivery = order.order_type === 'delivery';
    const typeEmoji = isDelivery ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ';

    let message = `🚨 НОВЫЙ ЗАКАЗ #${orderId} 🚨\n\n`;
    message += `📦 ${typeEmoji}\n`;
    message += order.order_time ? `⏰ КО ВРЕМЕНИ: ${order.order_time}\n` : `🚀 КАК МОЖНО СКОРЕЕ\n`;
    message += `👤 ${order.customer_name}\n`;
    message += `📞 ${order.phone}\n`;
    if (isDelivery && order.address) {
      message += `📍 ${order.address}\n`;
    }
    message += `\n🛒 Заказ:\n${itemsText}\n\n`;
    message += `💰 Оплачено: ${order.total} руб. ✅`;

    const keyboard = {
      inline: true,
      buttons: [
        [
          {
            action: {
              type: 'callback',
              label: '✅ Принял заказ',
              payload: JSON.stringify({ action: 'accepted', order_id: orderId, order_type: order.order_type, address: order.address || '' }),
            },
            color: 'positive',
          },
        ],
      ],
    };

    // Отправляем заказ каждому получателю (ты, баристы)
    for (const peerId of peerIds) {
      const params = new URLSearchParams({
        peer_id: peerId,
        message,
        random_id: (Date.now() + Math.floor(Math.random() * 100000)).toString(),
        keyboard: JSON.stringify(keyboard),
        access_token: VK_TOKEN,
        v: '5.131',
      });

      const res = await fetch('https://api.vk.com/method/messages.send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();
      if (data.error) {
        console.error(`Ошибка VK API для peer ${peerId}:`, data.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Ошибка vk-notify:', e);
    return NextResponse.json({ error: 'ошибка' }, { status: 500 });
  }
}
