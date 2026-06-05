import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orderId, orderType, customerName, phone, address, items, total } = await req.json();

    const VK_TOKEN = process.env.VK_TOKEN!;
    const VK_PEER_ID = Number(process.env.VK_PEER_ID);

    // Формируем текст заказа
    let itemsText = '';
    try {
      const parsed = JSON.parse(items);
      itemsText = parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
    } catch {
      itemsText = items;
    }

    const isDelivery = orderType === 'delivery';
    const typeEmoji = isDelivery ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ';

    let message = `🚨 НОВЫЙ ЗАКАЗ #${orderId} 🚨\n\n`;
    message += `📦 ${typeEmoji}\n`;
    message += `👤 ${customerName}\n`;
    message += `📞 ${phone}\n`;
    if (isDelivery && address) {
      message += `📍 ${address}\n`;
    }
    message += `\n🛒 Заказ:\n${itemsText}\n\n`;
    message += `💰 Оплачено: ${total} руб. ✅`;

    // Первая кнопка — всегда "Принял"
    const keyboard = {
      inline: true,
      buttons: [
        [
          {
            action: {
              type: 'callback',
              label: '✅ Принял заказ',
              payload: JSON.stringify({ action: 'accepted', order_id: orderId, order_type: orderType, address: address || '' }),
            },
            color: 'positive',
          },
        ],
      ],
    };

    const params = new URLSearchParams({
      peer_id: VK_PEER_ID.toString(),
      message,
      random_id: Date.now().toString(),
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
      console.error('Ошибка VK API:', data.error);
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Ошибка vk-notify:', e);
    return NextResponse.json({ error: 'ошибка' }, { status: 500 });
  }
}
