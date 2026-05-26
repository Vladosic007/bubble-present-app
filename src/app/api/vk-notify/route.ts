import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orderId, orderText } = await req.json();

    const VK_TOKEN = process.env.VK_TOKEN!;
    const VK_PEER_ID = Number(process.env.VK_PEER_ID);

    // Кнопки для курьера
    const keyboard = {
      inline: true,
      buttons: [
        [
          {
            action: {
              type: 'callback',
              label: '✅ Принял заказ',
              payload: JSON.stringify({ action: 'accepted', order_id: orderId }),
            },
            color: 'positive',
          },
        ],
        [
          {
            action: {
              type: 'callback',
              label: '🚗 Выехал к клиенту',
              payload: JSON.stringify({ action: 'on_the_way', order_id: orderId }),
            },
            color: 'primary',
          },
        ],
        [
          {
            action: {
              type: 'callback',
              label: '🎉 Доставил!',
              payload: JSON.stringify({ action: 'completed', order_id: orderId }),
            },
            color: 'positive',
          },
        ],
      ],
    };

    const params = new URLSearchParams({
      peer_id: VK_PEER_ID.toString(),
      message: orderText,
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
