import { supabaseAdmin } from './supabaseAdmin';

// За сколько минут до времени заказа слать уведомление баристе
const NOTIFY_BEFORE_MIN = 35;

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  console.log('⏰ Планировщик заказов "ко времени" запущен');
  // Проверяем каждую минуту
  setInterval(checkScheduledOrders, 60 * 1000);
  // Раз в 10 минут чистим "брошенные" неоплаченные заказы (старше 30 мин)
  setInterval(cleanupAbandonedPending, 10 * 60 * 1000);
  // Раз в 5 минут автозакрываем заказы "ждёт выдачи" / "в пути" старше 1 часа
  setInterval(autoCompleteStale, 5 * 60 * 1000);
}

// Текущее московское время в минутах от полуночи
function nowMoscowMinutes(): number {
  const d = new Date();
  const mskHour = (d.getUTCHours() + 3) % 24; // UTC+3
  return mskHour * 60 + d.getUTCMinutes();
}

async function sendVkNotify(orderId: number) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bubblepresent.ru';
  await fetch(`${base}/api/vk-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  }).catch((e) => console.error('Планировщик: ошибка отправки в ВК', e));
}

// 🧹 Автоуборка призрачных заказов: клиент открыл оплату и ушёл,
// заказ висит в pending_payment. Через 30 минут помечаем как cancelled,
// чтобы не засорять базу и не мешать идемпотентности.
async function cleanupAbandonedPending() {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('status', 'pending_payment')
      .lt('created_at', cutoff)
      .select('id');
    if (error) return;
    if (data && data.length) {
      console.log(`🧹 Автоочистка: отменено брошенных pending заказов: ${data.length}`);
    }
  } catch (e) {
    console.error('Автоочистка pending: ошибка', e);
  }
}

// ⏰ Автозакрытие: заказы "ждёт выдачи" (ready_for_pickup) или "в пути" (delivering/on_the_way)
// автоматически становятся "выдан/доставлен" через 1 час после смены статуса.
// Это стартует начисление коинов и левел-ап клиенту, даже если бариста забыл нажать кнопку.
async function autoCompleteStale() {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const staleStatuses = ['ready_for_pickup', 'delivering', 'on_the_way'];
    const { data } = await supabaseAdmin
      .from('orders')
      .select('id')
      .in('status', staleStatuses)
      .lt('status_updated_at', cutoff);
    if (!data || data.length === 0) return;
    for (const o of data) {
      await supabaseAdmin.from('orders')
        .update({ status: 'completed', status_updated_at: new Date().toISOString() })
        .eq('id', o.id);
      try {
        const { handleOrderCompleted } = await import('@/lib/coins');
        await handleOrderCompleted(o.id);
      } catch (e) { console.error('autoComplete: handleOrderCompleted error', e); }
      // Редактируем ВК-сообщения на "завершён" (без кнопок)
      try {
        const { editForAll } = await import('@/lib/vkMessages');
        const { buildBaristaText, buildBaristaKeyboard, buildCourierText, buildCourierKeyboard } = await import('@/lib/vkOrderText');
        const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', o.id).single();
        if (order) {
          const od: any = order;
          await editForAll(o.id, 'barista', buildBaristaText(od), buildBaristaKeyboard(od));
          await editForAll(o.id, 'courier', buildCourierText(od), buildCourierKeyboard(od));
        }
      } catch (e) { console.error('autoComplete: editForAll error', e); }
    }
    console.log(`⏰ Автозакрытие: закрыто заказов ${data.length}`);
  } catch (e) {
    console.error('autoCompleteStale error', e);
  }
}

async function checkScheduledOrders() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Оплаченные заказы "ко времени", которым ещё не слали уведомление
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_time, status, vk_notified, created_at')
      .not('order_time', 'is', null)
      .eq('vk_notified', false)
      .in('status', ['accepted', 'preparing'])
      .gte('created_at', since);

    if (error || !data) return;

    const nowMin = nowMoscowMinutes();

    for (const o of data) {
      if (!o.order_time) continue;
      const [h, m] = String(o.order_time).split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;
      const targetMin = h * 60 + m;

      // Пора уведомлять: наступило время (за 35 мин до заказа) или позже
      if (nowMin >= targetMin - NOTIFY_BEFORE_MIN) {
        await sendVkNotify(o.id);
        await supabaseAdmin.from('orders').update({ vk_notified: true }).eq('id', o.id);
        console.log(`⏰ Заказ #${o.id} (ко времени ${o.order_time}) отправлен баристе`);
      }
    }
  } catch (e) {
    console.error('Планировщик: ошибка', e);
  }
}
