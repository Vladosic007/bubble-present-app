import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// === WEB PUSH ===
// Ключи берём из env (на сервере). Если их нет — функции просто молчат.
const PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@bubblepresent.ru';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').replace(/^8/, '7');

export type PushPayload = { title: string; body: string; url?: string };

// Отправка на одну подписку. Возвращает false, если подписка мертва (нужно удалить).
async function sendOne(sub: any, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (e: any) {
    const code = e?.statusCode;
    if (code === 404 || code === 410) return false; // подписка протухла
    console.error('push sendOne error', code);
    return true; // не удаляем при прочих ошибках
  }
}

// Отправить всем подпискам конкретного телефона
export async function sendToPhone(phone: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return;
  const { data } = await supabaseAdmin.from('push_subscriptions').select('endpoint, subscription').eq('phone', phoneNorm);
  for (const row of data || []) {
    const alive = await sendOne(row.subscription, payload);
    if (!alive) await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
  }
}

// Рассылка всем подписчикам. Возвращает число успешных.
export async function sendBroadcast(payload: PushPayload, onlyPhones?: string[]): Promise<number> {
  if (!ensureConfigured()) return 0;
  let query = supabaseAdmin.from('push_subscriptions').select('endpoint, subscription, phone');
  if (onlyPhones && onlyPhones.length) query = query.in('phone', onlyPhones);
  const { data } = await query;
  let sent = 0;
  for (const row of data || []) {
    const alive = await sendOne(row.subscription, payload);
    if (alive) sent++;
    else await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
  }
  return sent;
}

// Сохранить/обновить подписку
export async function saveSubscription(phone: string, subscription: any): Promise<void> {
  const phoneNorm = normalizePhone(phone);
  if (!subscription?.endpoint) return;
  await supabaseAdmin.from('push_subscriptions').upsert(
    { phone: phoneNorm || null, endpoint: subscription.endpoint, subscription },
    { onConflict: 'endpoint' }
  );
}

export function getPublicKey(): string {
  return PUBLIC;
}

// Текст пуша по статусу заказа
function statusMessage(status: string, orderId: number, orderType: string): PushPayload | null {
  const delivery = orderType === 'delivery';
  switch (status) {
    case 'accepted': return { title: '🆕 Заказ принят!', body: `Заказ #${orderId} принят. Скоро начнём готовить!`, url: '/cart' };
    case 'preparing': return { title: '🧑‍🍳 Колдуем!', body: `Бариста готовит твой заказ #${orderId}`, url: '/cart' };
    case 'ready_for_pickup': return { title: '🛍 Заказ готов!', body: `Заказ #${orderId} ждёт тебя. Забегай!`, url: '/cart' };
    case 'ready_for_courier': return { title: '📦 Почти готово!', body: `Заказ #${orderId} передаём курьеру`, url: '/cart' };
    case 'delivering':
    case 'on_the_way': return { title: '🛵 Курьер в пути!', body: `Заказ #${orderId} уже едет к тебе`, url: '/cart' };
    case 'completed': return { title: delivery ? '✅ Доставлено!' : '✅ Выдано!', body: `Спасибо за заказ #${orderId}! Тебе начислены баблкоины 🪙`, url: '/coins' };
    default: return null;
  }
}

// Отправить пуш клиенту о смене статуса заказа
export async function notifyOrderStatus(orderId: number, status: string): Promise<void> {
  try {
    const { data: order } = await supabaseAdmin.from('orders').select('phone, order_type, customer_name').eq('id', orderId).single();
    if (!order?.phone) return;
    if ((order.customer_name || '').trim().toUpperCase() === 'ТЕСТ') return;
    const msg = statusMessage(status, orderId, order.order_type);
    if (msg) await sendToPhone(order.phone, msg);
  } catch (e) {
    console.error('notifyOrderStatus error', e);
  }
}
