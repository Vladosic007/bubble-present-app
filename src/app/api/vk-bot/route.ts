import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { handleOrderCompleted } from '@/lib/coins';
import { notifyOrderStatus } from '@/lib/push';

const VK_TOKEN = process.env.VK_TOKEN!;

// Список курьеров (отдельный канал только для доставки)
const COURIER_PEERS = (process.env.VK_PEER_ID_COURIER || '').split(',').map(s => s.trim()).filter(Boolean);

// Отправка сообщения в ВК
async function sendVK(peer_id: number | string, message: string, keyboard?: object) {
  const params: Record<string, string> = {
    peer_id: peer_id.toString(),
    message,
    random_id: (Date.now() + Math.floor(Math.random() * 100000)).toString(),
    access_token: VK_TOKEN,
    v: '5.131',
  };
  if (keyboard) params.keyboard = JSON.stringify(keyboard);

  await fetch('https://api.vk.com/method/messages.send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
}

// Отправка сообщения ВСЕМ курьерам
async function sendToCouriers(message: string, keyboard?: object) {
  for (const peer of COURIER_PEERS) {
    await sendVK(peer, message, keyboard);
  }
}

// Ответ на callback-кнопку (снэкбар)
async function answerCallback(event_id: string, user_id: number, peer_id: number, text: string) {
  await fetch('https://api.vk.com/method/messages.sendMessageEventAnswer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      event_id,
      user_id: user_id.toString(),
      peer_id: peer_id.toString(),
      event_data: JSON.stringify({ type: 'show_snackbar', text }),
      access_token: VK_TOKEN,
      v: '5.131',
    }).toString(),
  });
}

// Генерируем ссылку на Яндекс Карты с маршрутом
function getYandexMapsLink(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://yandex.ru/maps/?rtext=~${encoded}&rtt=auto`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Подтверждение Callback API
    if (body.type === 'confirmation') {
      return new Response(process.env.VK_CONFIRMATION || '420b621c', { status: 200 });
    }

    // Нажатие callback-кнопки
    if (body.type === 'message_event') {
      // Защита: принимаем только запросы с верным секретом ВК
      if (process.env.VK_SECRET && body.secret !== process.env.VK_SECRET) {
        console.warn('VK-bot: отклонён запрос с неверным секретом');
        return new Response('ok', { status: 200 });
      }

      const { event_id, user_id, peer_id, payload } = body.object;
      const { action, order_id, order_type, address } = payload;

      // ========== ПРИНЯЛ ==========
      if (action === 'accepted') {
        await supabase.from('orders').update({ status: 'preparing' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `✅ Заказ #${order_id} принят!`);

        // Следующая кнопка: Готовлю
        const nextKeyboard = {
          inline: true,
          buttons: [[{
            action: {
              type: 'callback',
              label: '🧑‍🍳 Готовлю',
              payload: JSON.stringify({ action: 'preparing', order_id, order_type, address }),
            },
            color: 'primary',
          }]],
        };
        await sendVK(peer_id, `✅ Заказ #${order_id} принят! Начинаем готовить.`, nextKeyboard);
      }

      // ========== ГОТОВЛЮ ==========
      if (action === 'preparing') {
        const isDelivery = order_type === 'delivery';

        if (isDelivery) {
          // Доставка → следующий статус: ждёт курьера
          await supabase.from('orders').update({ status: 'ready_for_courier' }).eq('id', order_id);
          await answerCallback(event_id, user_id, peer_id, `📦 Заказ #${order_id} ждёт курьера!`);

          const nextKeyboard = {
            inline: true,
            buttons: [[{
              action: {
                type: 'callback',
                label: '📦 Готов — ждёт курьера',
                payload: JSON.stringify({ action: 'ready_for_courier', order_id, order_type, address }),
              },
              color: 'primary',
            }]],
          };
          await sendVK(peer_id, `🧑‍🍳 Заказ #${order_id} готовится...`, nextKeyboard);
        } else {
          // Самовывоз → следующий статус: готов к выдаче
          await supabase.from('orders').update({ status: 'ready_for_pickup' }).eq('id', order_id);
          await answerCallback(event_id, user_id, peer_id, `🛍 Заказ #${order_id} готов!`);

          const nextKeyboard = {
            inline: true,
            buttons: [[{
              action: {
                type: 'callback',
                label: '🛍 Готов — забирай!',
                payload: JSON.stringify({ action: 'ready_for_pickup', order_id, order_type, address }),
              },
              color: 'positive',
            }]],
          };
          await sendVK(peer_id, `🧑‍🍳 Заказ #${order_id} готовится...`, nextKeyboard);
        }
      }

      // ========== ГОТОВ К ВЫДАЧЕ (самовывоз) ==========
      if (action === 'ready_for_pickup') {
        await supabase.from('orders').update({ status: 'ready_for_pickup' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `🛍 Заказ #${order_id} ждёт клиента!`);

        const nextKeyboard = {
          inline: true,
          buttons: [[{
            action: {
              type: 'callback',
              label: '✅ Выдан клиенту',
              payload: JSON.stringify({ action: 'completed', order_id, order_type, address }),
            },
            color: 'positive',
          }]],
        };
        await sendVK(peer_id, `🛍 Заказ #${order_id} готов! Ждём клиента.`, nextKeyboard);
      }

      // ========== ЖДЁТ КУРЬЕРА (доставка) ==========
      if (action === 'ready_for_courier') {
        await supabase.from('orders').update({ status: 'ready_for_courier' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `📦 Заказ #${order_id} ждёт курьера!`);

        // Получаем полные данные заказа для курьера
        const { data: orderData } = await supabase
          .from('orders').select('*').eq('id', order_id).single();

        let itemsText = '';
        if (orderData) {
          try {
            const parsed = JSON.parse(orderData.items);
            itemsText = parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
          } catch { itemsText = orderData.items; }
        }

        const mapsLink = getYandexMapsLink(address || orderData?.address || '');

        // Отдельное сообщение для курьера
        let courierMsg = `🚗 ДОСТАВКА — ЗАКАЗ #${order_id} 🚗\n\n`;
        courierMsg += orderData?.order_time ? `⏰ КО ВРЕМЕНИ: ${orderData.order_time}\n` : `🚀 КАК МОЖНО СКОРЕЕ\n`;
        courierMsg += `👤 ${orderData?.customer_name || 'Клиент'}\n`;
        courierMsg += `📞 ${orderData?.phone || ''}\n`;
        courierMsg += `📍 Адрес: ${address || orderData?.address || ''}\n`;
        courierMsg += `🗺 Маршрут: ${mapsLink}\n\n`;
        courierMsg += `🛒 Заказ:\n${itemsText}\n\n`;
        courierMsg += `💰 ${orderData?.total || ''} руб.\n\n`;
        courierMsg += `⬇️ Нажми когда выехал:`;

        const courierKeyboard = {
          inline: true,
          buttons: [[{
            action: {
              type: 'callback',
              label: '🚗 Курьер в пути',
              payload: JSON.stringify({ action: 'on_the_way', order_id, order_type, address }),
            },
            color: 'primary',
          }]],
        };

        // Бариста видит что заказ передан курьеру
        await sendVK(peer_id, `📦 Заказ #${order_id} передан курьеру! Ждём доставку.`);

        // Курьеру в его ОТДЕЛЬНЫЙ канал — только доставка с адресом и кнопками
        if (COURIER_PEERS.length > 0) {
          await sendToCouriers(courierMsg, courierKeyboard);
        } else {
          // Если курьер не настроен — шлём баристе как раньше (запасной вариант)
          await sendVK(peer_id, courierMsg, courierKeyboard);
        }
      }

      // ========== КУРЬЕР В ПУТИ ==========
      if (action === 'on_the_way') {
        await supabase.from('orders').update({ status: 'on_the_way' }).eq('id', order_id);
        await answerCallback(event_id, user_id, peer_id, `🚗 Заказ #${order_id} — едем!`);

        const nextKeyboard = {
          inline: true,
          buttons: [[{
            action: {
              type: 'callback',
              label: '🎉 Доставлен!',
              payload: JSON.stringify({ action: 'completed', order_id, order_type, address }),
            },
            color: 'positive',
          }]],
        };
        await sendVK(peer_id, `🚗 Заказ #${order_id} — курьер выехал к клиенту!`, nextKeyboard);
      }

      // ========== ЗАВЕРШЕН ==========
      if (action === 'completed') {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', order_id);
        // Начисляем баблкоины клиенту + проверяем левел-ап
        await handleOrderCompleted(order_id);
        await answerCallback(event_id, user_id, peer_id, `🎉 Заказ #${order_id} завершён!`);

        const isDelivery = order_type === 'delivery';
        const doneMsg = isDelivery
          ? `🎉 Заказ #${order_id} доставлен! Отличная работа.`
          : `🎉 Заказ #${order_id} выдан клиенту! Отличная работа.`;

        await sendVK(peer_id, doneMsg);
      }

      // Push клиенту о текущем статусе заказа (один раз, после обработки кнопки)
      if (order_id) {
        const { data: ord } = await supabase.from('orders').select('status').eq('id', order_id).single();
        if (ord?.status) await notifyOrderStatus(order_id, ord.status);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('Ошибка ВК бота:', error);
    return new Response('ok', { status: 200 });
  }
}
