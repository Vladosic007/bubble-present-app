import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { orderId, auto, phone } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'no orderId' }, { status: 400 });

    // Читаем текущий статус
    const { data: order, error: readErr } = await supabaseAdmin
      .from('orders')
      .select('status, phone')
      .eq('id', orderId)
      .single();

    if (readErr || !order) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // ЗАЩИТА: ручную отмену может делать только владелец заказа (совпадение телефона).
    // Иначе любой мог бы отменять чужие заказы, перебирая id.
    const norm = (p: string) => (p || '').replace(/\D/g, '').replace(/^8/, '7');
    if (!auto && norm(phone) !== norm(order.phone)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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
      .update({ status: 'cancelled', status_updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updErr) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    // Если заказ был оплачен — редактируем ранее отправленные сообщения баристам/курьеру
    // на текст "ОТМЕНЁН КЛИЕНТОМ" (без кнопок). Никаких новых уведомлений.
    if (previousStatus !== 'pending_payment') {
      try {
        const { editForAll } = await import('@/lib/vkMessages');
        const cancelMsg = `❌ ЗАКАЗ #${orderId} ОТМЕНЁН КЛИЕНТОМ\n\nКлиент передумал. Не готовьте!`;
        const noKeyboard = { inline: true, buttons: [] };
        await editForAll(orderId, 'barista', cancelMsg, noKeyboard);
        await editForAll(orderId, 'courier', cancelMsg, noKeyboard);
      } catch (e) { console.error('cancel edit vk error', e); }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Ошибка order/cancel:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
