import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { orderId, auto } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'no orderId' }, { status: 400 });

    // Читаем текущий статус
    const { data: order, error: readErr } = await supabaseAdmin
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (readErr || !order) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // Нельзя отменить уже завершённый/отменённый
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'not cancellable' }, { status: 400 });
    }

    const previousStatus = order.status;

    // ЗАЩИТА: авто-отмена (по таймауту 10 мин) разрешена ТОЛЬКО для неоплаченных заказов.
    // Если заказ уже оплачен (accepted и т.д.) — НЕ отменяем (клиент мог просто потерять связь).
    if (auto && previousStatus !== 'pending_payment') {
      console.log(`🛡 Авто-отмена заказа #${orderId} отклонена — он уже оплачен (статус ${previousStatus})`);
      return NextResponse.json({ skipped: true });
    }

    console.log(`🚫 Отмена заказа #${orderId} (был статус: ${previousStatus}, авто: ${!!auto})`);

    // Отменяем
    const { error: updErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    if (updErr) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    // Если заказ был оплачен (не висел в ожидании оплаты) — шлём отмену в ВК
    if (previousStatus !== 'pending_payment') {
      const VK_TOKEN = process.env.VK_TOKEN!;
      const peerIds = (process.env.VK_PEER_ID || '').split(',').map(s => s.trim()).filter(Boolean);
      const msg = `❌ ЗАКАЗ #${orderId} ОТМЕНЕН КЛИЕНТОМ ❌\n\nКлиент передумал и отменил заказ. Не готовьте его!`;

      for (const peerId of peerIds) {
        const params = new URLSearchParams({
          peer_id: peerId,
          message: msg,
          random_id: (Date.now() + Math.floor(Math.random() * 100000)).toString(),
          access_token: VK_TOKEN,
          v: '5.131',
        });
        await fetch('https://api.vk.com/method/messages.send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Ошибка order/cancel:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
