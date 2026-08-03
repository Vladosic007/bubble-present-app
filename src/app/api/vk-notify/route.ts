import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { vkSend, saveVkMessages, VkMessagesMap } from '@/lib/vkMessages';
import { buildBaristaText, buildBaristaKeyboard, OrderData } from '@/lib/vkOrderText';

// Первое уведомление баристам: отправляем одно сообщение каждому, сохраняем message_id.
// Далее при смене статуса это сообщение просто редактируется — новых уведомлений не летит.
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'no orderId' }, { status: 400 });

    const peerIds = (process.env.VK_PEER_ID || '').split(',').map(s => s.trim()).filter(Boolean);
    const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (error || !order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

    const o: OrderData = order as any;
    const text = buildBaristaText(o);
    const keyboard = buildBaristaKeyboard(o);

    const saved: VkMessagesMap = { barista: [] };
    for (const peerId of peerIds) {
      const mid = await vkSend(peerId, text, keyboard);
      if (mid) saved.barista!.push({ peer_id: peerId, message_id: mid });
    }
    await saveVkMessages(orderId, saved);

    return NextResponse.json({ success: true, sent: saved.barista!.length });
  } catch (e) {
    console.error('Ошибка vk-notify:', e);
    return NextResponse.json({ error: 'ошибка' }, { status: 500 });
  }
}
