// Единый форматтер сообщения баристе — меняет текст под текущий статус заказа
// Одно сообщение, редактируется — все данные в одном месте.

export type OrderData = {
  id: number;
  status: string;
  customer_name: string;
  phone: string;
  address?: string;
  order_type: string;
  order_time?: string | null;
  items: string;
  total: number;
};

const STATUS_HEADER: Record<string, string> = {
  accepted: '🚨 НОВЫЙ ЗАКАЗ',
  preparing: '🧑‍🍳 ГОТОВИТСЯ',
  ready_for_pickup: '🛍 ГОТОВ К ВЫДАЧЕ',
  ready_for_courier: '📦 ЖДЁТ КУРЬЕРА',
  on_the_way: '🛵 В ПУТИ',
  delivering: '🛵 В ПУТИ',
  completed: '✅ ЗАВЕРШЁН',
  cancelled: '❌ ОТМЕНЁН',
};

// Следующий шаг для баристы (кнопка) по текущему статусу
export function nextActionForStatus(status: string, order_type: string): { label: string; action: string } | null {
  const isDelivery = order_type === 'delivery';
  switch (status) {
    case 'accepted': return { label: '🧑‍🍳 Готовлю', action: 'preparing' };
    case 'preparing': return isDelivery
      ? { label: '📦 Готов — ждёт курьера', action: 'ready_for_courier' }
      : { label: '🛍 Готов — забирай!', action: 'ready_for_pickup' };
    case 'ready_for_pickup': return { label: '✅ Выдан клиенту', action: 'completed' };
    case 'ready_for_courier': return { label: '📦 Отдал курьеру', action: 'ready_for_courier' };
    default: return null;
  }
}

export function buildBaristaText(order: OrderData): string {
  const header = STATUS_HEADER[order.status] || '🚨 ЗАКАЗ';
  const isDelivery = order.order_type === 'delivery';
  const typeEmoji = isDelivery ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ';

  let itemsText = '';
  try {
    const parsed = JSON.parse(order.items);
    itemsText = parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
  } catch {
    itemsText = order.items;
  }

  let msg = `${header} #${order.id}\n\n`;
  msg += `📦 ${typeEmoji}\n`;
  msg += order.order_time ? `⏰ КО ВРЕМЕНИ: ${order.order_time}\n` : `🚀 КАК МОЖНО СКОРЕЕ\n`;
  msg += `👤 ${order.customer_name}\n`;
  msg += `📞 ${order.phone}\n`;
  if (isDelivery && order.address) msg += `📍 ${order.address}\n`;
  msg += `\n🛒 Заказ:\n${itemsText}\n\n`;
  msg += `💰 ${order.total} руб.`;
  return msg;
}

export function buildBaristaKeyboard(order: OrderData): object {
  const next = nextActionForStatus(order.status, order.order_type);
  if (!next) return { inline: true, buttons: [] };
  return {
    inline: true,
    buttons: [[{
      action: {
        type: 'callback',
        label: next.label,
        payload: JSON.stringify({ action: next.action, order_id: order.id, order_type: order.order_type, address: order.address || '' }),
      },
      color: next.action === 'completed' ? 'positive' : 'primary',
    }]],
  };
}

export function buildCourierText(order: OrderData): string {
  const header = order.status === 'completed' ? '✅ ДОСТАВЛЕН'
    : order.status === 'on_the_way' || order.status === 'delivering' ? '🛵 В ПУТИ'
    : '🚗 ДОСТАВКА';
  let itemsText = '';
  try {
    const parsed = JSON.parse(order.items);
    itemsText = parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
  } catch { itemsText = order.items; }

  const mapsLink = order.address ? `https://yandex.ru/maps/?rtext=~${encodeURIComponent(order.address)}&rtt=auto` : '';

  let msg = `${header} — ЗАКАЗ #${order.id}\n\n`;
  msg += order.order_time ? `⏰ КО ВРЕМЕНИ: ${order.order_time}\n` : `🚀 КАК МОЖНО СКОРЕЕ\n`;
  msg += `👤 ${order.customer_name}\n`;
  msg += `📞 ${order.phone}\n`;
  msg += `📍 ${order.address || ''}\n`;
  if (mapsLink) msg += `🗺 Маршрут: ${mapsLink}\n\n`;
  msg += `🛒 Заказ:\n${itemsText}\n\n`;
  msg += `💰 ${order.total} руб.`;
  return msg;
}

export function buildCourierKeyboard(order: OrderData): object {
  if (order.status === 'ready_for_courier') {
    return {
      inline: true,
      buttons: [[{
        action: { type: 'callback', label: '🛵 Выехал', payload: JSON.stringify({ action: 'on_the_way', order_id: order.id, order_type: 'delivery', address: order.address || '' }) },
        color: 'primary',
      }]],
    };
  }
  if (order.status === 'on_the_way' || order.status === 'delivering') {
    return {
      inline: true,
      buttons: [[{
        action: { type: 'callback', label: '✅ Доставил', payload: JSON.stringify({ action: 'completed', order_id: order.id, order_type: 'delivery', address: order.address || '' }) },
        color: 'positive',
      }]],
    };
  }
  return { inline: true, buttons: [] };
}
