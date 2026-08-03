import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { handleOrderCompleted } from '@/lib/coins';
import { notifyOrderStatus } from '@/lib/push';
import { vkSend, editForAll, getVkMessages, saveVkMessages } from '@/lib/vkMessages';
import { buildBaristaText, buildBaristaKeyboard, buildCourierText, buildCourierKeyboard, OrderData } from '@/lib/vkOrderText';

const VK_TOKEN = process.env.VK_TOKEN!;
const COURIER_PEERS = (process.env.VK_PEER_ID_COURIER || '').split(',').map(s => s.trim()).filter(Boolean);

// Ответ на callback-кнопку (мгновенное всплывающее уведомление в чате)
async function answerCallback(event_id: string, user_id: number, peer_id: number, text: string) {
  await fetch('https://api.vk.com/method/messages.sendMessageEventAnswer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      event_id, user_id: user_id.toString(), peer_id: peer_id.toString(),
      event_data: JSON.stringify({ type: 'show_snackbar', text }),
      access_token: VK_TOKEN, v: '5.131',
    }).toString(),
  });
}

// Переход статуса при нажатии на кнопку
function nextStatus(action: string, order_type: string): string | null {
  const isDelivery = order_type === 'delivery';
  switch (action) {
    case 'accepted': return 'preparing';
    case 'preparing': return isDelivery ? 'ready_for_courier' : 'ready_for_pickup';
    case 'ready_for_pickup': return 'completed';       // самовывоз — сразу выдан
    case 'ready_for_courier': return 'ready_for_courier'; // передан курьеру (тот же статус, но триггер отправки курьеру)
    case 'on_the_way': return 'on_the_way';            // отдельно (кнопка курьера — Выехал уже нажата, статус ставится в handler ниже)
    case 'completed': return 'completed';
    default: return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === 'confirmation') {
      return new Response(process.env.VK_CONFIRMATION || '420b621c', { status: 200 });
    }

    if (body.type === 'message_event') {
      if (process.env.VK_SECRET && body.secret !== process.env.VK_SECRET) {
        console.warn('VK-bot: отклонён запрос с неверным секретом');
        return new Response('ok', { status: 200 });
      }

      const { event_id, user_id, peer_id, payload } = body.object;
      const { action, order_id, order_type } = payload;

      // Определяем новый статус по действию
      // Для 'on_the_way' — курьер нажал "выехал" → ставим on_the_way
      let newStatus: string | null = null;
      if (action === 'on_the_way') newStatus = 'on_the_way';
      else if (action === 'completed') newStatus = 'completed';
      else newStatus = nextStatus(action, order_type);

      if (!newStatus) return new Response('ok', { status: 200 });

      // Обновляем статус
      await supabase.from('orders')
        .update({ status: newStatus, status_updated_at: new Date().toISOString() })
        .eq('id', order_id);

      // Начисление коинов + push при завершении
      if (newStatus === 'completed') await handleOrderCompleted(order_id);

      // Всплывающее уведомление в чате
      const snackText = {
        preparing: '✅ Готовим!',
        ready_for_pickup: '🛍 Готов к выдаче!',
        ready_for_courier: '📦 Ждёт курьера',
        on_the_way: '🛵 Курьер выехал',
        completed: '🎉 Заказ завершён!',
      }[newStatus] || `Статус: ${newStatus}`;
      await answerCallback(event_id, user_id, peer_id, snackText);

      // Тянем свежий заказ
      const { data: order } = await supabase.from('orders').select('*').eq('id', order_id).single();
      if (!order) return new Response('ok', { status: 200 });
      const o: OrderData = order as any;

      // Редактируем сообщение баристам — новый текст, новые кнопки (или без)
      await editForAll(order_id, 'barista', buildBaristaText(o), buildBaristaKeyboard(o));

      // Особый случай: передан курьеру → отправляем/редактируем сообщение курьеру
      if (newStatus === 'ready_for_courier') {
        const vk = await getVkMessages(order_id);
        if (!vk.courier || vk.courier.length === 0) {
          // Первый раз — отправляем курьерам
          const courierList: Array<{ peer_id: string; message_id: number }> = [];
          if (COURIER_PEERS.length > 0) {
            for (const cp of COURIER_PEERS) {
              const mid = await vkSend(cp, buildCourierText(o), buildCourierKeyboard(o));
              if (mid) courierList.push({ peer_id: cp, message_id: mid });
            }
          }
          await saveVkMessages(order_id, { ...vk, courier: courierList });
        } else {
          // Уже есть — редактируем (страховка)
          await editForAll(order_id, 'courier', buildCourierText(o), buildCourierKeyboard(o));
        }
      }

      // Для остальных статусов при существующих курьерских сообщениях — тоже редактируем их
      if (newStatus === 'on_the_way' || newStatus === 'completed') {
        await editForAll(order_id, 'courier', buildCourierText(o), buildCourierKeyboard(o));
      }

      // Push клиенту
      await notifyOrderStatus(order_id, newStatus);
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('Ошибка ВК бота:', error);
    return new Response('ok', { status: 200 });
  }
}
