import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VK_TOKEN = process.env.VK_TOKEN!;
const VK_CONFIRMATION = process.env.VK_CONFIRMATION!;

// Отправка сообщения в ВК
async function sendVK(peer_id: number, message: string) {
  const params = new URLSearchParams({
    peer_id: peer_id.toString(),
    message,
    random_id: Date.now().toString(),
    access_token: VK_TOKEN,
    v: '5.131',
  });

  await fetch('https://api.vk.com/method/messages.send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Подтверждение адреса (одноразовая проверка при настройке)
    if (body.type === 'confirmation') {
      const confirmStr = process.env.VK_CONFIRMATION ?? '';
      return new Response(confirmStr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Length': Buffer.byteLength(confirmStr).toString(),
        },
      });
    }

    // Курьер нажал кнопку
    if (body.type === 'message_event') {
      const { peer_id, payload } = body.object;
      const { action, order_id } = payload;

      if (action === 'accepted') {
        await supabase.from('orders').update({ status: 'accepted' }).eq('id', order_id);
        await sendVK(peer_id, `✅ Заказ #${order_id} принят! Начинаем готовить.`);

        // Уведомление в TG
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            message_thread_id: Number(process.env.TELEGRAM_TOPIC_ID),
            text: `✅ Заказ #${order_id} принят курьером`,
          }),
        }).catch(() => {});
      }

      if (action === 'on_the_way') {
        await supabase.from('orders').update({ status: 'on_the_way' }).eq('id', order_id);
        await sendVK(peer_id, `🚗 Заказ #${order_id} — курьер выехал!`);

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            message_thread_id: Number(process.env.TELEGRAM_TOPIC_ID),
            text: `🚗 Заказ #${order_id} — курьер в пути`,
          }),
        }).catch(() => {});
      }

      if (action === 'completed') {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', order_id);
        await sendVK(peer_id, `🎉 Заказ #${order_id} доставлен! Спасибо.`);

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            message_thread_id: Number(process.env.TELEGRAM_TOPIC_ID),
            text: `🎉 Заказ #${order_id} доставлен!`,
          }),
        }).catch(() => {});
      }
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('Ошибка ВК бота:', error);
    return new Response('ok', { status: 200 }); // ВК требует 200 даже при ошибке
  }
}
