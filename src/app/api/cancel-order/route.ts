import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const TOPIC_ID = process.env.TELEGRAM_TOPIC_ID;

    const cancelMessage = `❌ ЗАКАЗ #${orderId} ОТМЕНЕН КЛИЕНТОМ ❌\n\nКлиент передумал и отменил заказ. Не готовьте его! Возврат средств!`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_thread_id: Number(TOPIC_ID),
        text: cancelMessage,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка отмены заказа:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}