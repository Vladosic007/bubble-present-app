// === Утилиты для ВК-сообщений: одно сообщение на заказ, редактируется при смене статуса ===
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const VK_TOKEN = process.env.VK_TOKEN!;
const V = '5.131';

// Отправить сообщение — возвращает message_id (глобальный, для дальнейшего edit)
export async function vkSend(peerId: string | number, message: string, keyboard?: object): Promise<number | null> {
  const params: Record<string, string> = {
    peer_id: peerId.toString(),
    message,
    random_id: (Date.now() + Math.floor(Math.random() * 100000)).toString(),
    access_token: VK_TOKEN, v: V,
  };
  if (keyboard) params.keyboard = JSON.stringify(keyboard);
  try {
    const res = await fetch('https://api.vk.com/method/messages.send', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json();
    if (data.error) { console.error('vkSend error', peerId, data.error?.error_msg); return null; }
    return Number(data.response) || null;
  } catch (e) { console.error('vkSend exception', e); return null; }
}

// Отредактировать ранее отправленное сообщение (по message_id)
export async function vkEdit(peerId: string | number, messageId: number, message: string, keyboard?: object): Promise<boolean> {
  const params: Record<string, string> = {
    peer_id: peerId.toString(),
    message_id: String(messageId),
    message,
    keep_forward_messages: '1', keep_snippets: '1',
    access_token: VK_TOKEN, v: V,
  };
  if (keyboard) params.keyboard = JSON.stringify(keyboard);
  else params.keyboard = JSON.stringify({ inline: true, buttons: [] }); // убрать кнопки
  try {
    const res = await fetch('https://api.vk.com/method/messages.edit', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json();
    if (data.error) { console.error('vkEdit error', peerId, messageId, data.error?.error_msg); return false; }
    return true;
  } catch (e) { console.error('vkEdit exception', e); return false; }
}

// Тип хранения message_id по каждому peer'у (баристы + курьер отдельно)
export type VkMessagesMap = {
  barista?: Array<{ peer_id: string; message_id: number }>;
  courier?: Array<{ peer_id: string; message_id: number }>;
};

export async function getVkMessages(orderId: number): Promise<VkMessagesMap> {
  const { data } = await supabaseAdmin.from('orders').select('vk_messages').eq('id', orderId).single();
  return (data?.vk_messages as VkMessagesMap) || {};
}

export async function saveVkMessages(orderId: number, next: VkMessagesMap): Promise<void> {
  await supabaseAdmin.from('orders').update({ vk_messages: next }).eq('id', orderId);
}

// Редактировать сообщения у всех сохранённых peer'ов (баристы или курьер)
export async function editForAll(
  orderId: number, target: 'barista' | 'courier', newText: string, newKeyboard?: object
): Promise<void> {
  const map = await getVkMessages(orderId);
  const list = map[target] || [];
  for (const it of list) {
    await vkEdit(it.peer_id, it.message_id, newText, newKeyboard);
  }
}
