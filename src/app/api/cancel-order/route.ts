import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    const VK_TOKEN = process.env.VK_TOKEN!;
    const peerIds = (process.env.VK_PEER_ID || '').split(',').map(s => s.trim()).filter(Boolean);

    const cancelMessage = `❌ ЗАКАЗ #${orderId} ОТМЕНЕН КЛИЕНТОМ ❌\n\nКлиент передумал и отменил заказ. Не готовьте его!`;

    // Шлём отмену всем получателям
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
