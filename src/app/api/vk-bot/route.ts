import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VK_TOKEN = process.env.VK_TOKEN!;

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

// Ответ на нажатие callback-кнопки (убирает "загрузку" на кнопке)
async function answerCallback(event_id: string, user_id: number, peer_id: number, text: string) {
  const params = new URLSearchParams({
    event_id,
    user_id: user_id.toString(),
    peer_id: peer_id.toString(),
    event_data: JSON.stringify({ type: 'show_snackbar', text }),
    access_token: VK_TOKEN,
    v: '5.131',
  });

  await fetch('https://api.vk.com/method/messages.sendMessageEventAnswer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}

// Отправка в ТГ
async function sendTG(text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      message_thread_id: Number(process.env.TELEGRAM_TOPIC_ID),
      text,
    }),
  }).catch(() => {});
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Подтверждение адреса (одноразовая проверка при настройке)
    if (body.type === 'confirmation') {
      return new Response(process.env.VK_CONFIRMATION || '420b621c', { status: 200 });
    }

    // Курьер нажал callback-кнопку
    if (body.type === 'message_event') {
      const { event_id, user_id, peer_id, payload } = body.object;
      const { action, order_id } = payload;

      if (action === 'accepted') {
        await supabase.from('orders').update({ status: 'accepted' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `✅ Заказ #${order_id} принят!`);
        await sendVK(peer_id, `✅ Заказ #${order_id} принят! Начинаем готовить.`);
        await sendTG(`✅ Заказ #${order_id} принят курьером`);
      }

      if (action === 'on_the_way') {
        await supabase.from('orders').update({ status: 'on_the_way' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `🚗 Заказ #${order_id} — выехал!`);
        await sendVK(peer_id, `🚗 Заказ #${order_id} — курьер выехал к клиенту!`);
        await sendTG(`🚗 Заказ #${order_id} — курьер в пути`);
      }

      if (action === 'completed') {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `🎉 Заказ #${order_id} доставлен!`);
        await sendVK(peer_id, `🎉 Заказ #${order_id} доставлен! Отличная работа.`);
        await sendTG(`🎉 Заказ #${order_id} доставлен!`);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('Ошибка ВК бота:', error);
    return new Response('ok', { status: 200 });
  }
}
