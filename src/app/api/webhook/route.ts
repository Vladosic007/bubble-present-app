import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ❗ Слушаем только событие "Оплата прошла успешно" ❗
    if (body.event === 'payment.succeeded') {
      const paymentObj = body.object;
      
      // Достаем ID заказа, который мы передали в ЮKassa при создании платежа
      const orderId = paymentObj.metadata?.order_id;

      if (!orderId) {
        console.error('Ошибка: ЮKassa не прислала order_id в metadata');
        return NextResponse.json({ error: 'Order ID not found' }, { status: 400 });
      }

      // === 1. МЕНЯЕМ СТАТУС В БАЗЕ (Заказ оплачен!) ===
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', orderId);

      if (updateError) {
        console.error(`Ошибка обновления статуса заказа #${orderId}:`, updateError);
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      // === 2. ПОЛУЧАЕМ ДАННЫЕ ЗАКАЗА (Чтобы красиво написать в ТГ) ===
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !orderData) {
        console.error(`Ошибка получения заказа #${orderId} из базы:`, fetchError);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // === 3. ОТПРАВЛЯЕМ СООБЩЕНИЕ БАРИСТЕ В ТЕЛЕГРАМ ===
      // Распаковываем список товаров
      const itemsText = (() => {
        try {
          const parsed = JSON.parse(orderData.items);
          return parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
        } catch {
          return orderData.items; // если вдруг там не JSON
        }
      })();

      const tgMessage = `🚨 НОВЫЙ ОПЛАЧЕННЫЙ ЗАКАЗ #${orderId} 🚨\n\n` +
        `📦 Тип: ${orderData.order_type === 'delivery' ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ'}\n` +
        `👤 Имя: ${orderData.customer_name}\n` +
        `📞 Телефон: ${orderData.phone}\n` +
        (orderData.order_type === 'delivery' ? `📍 Адрес: ${orderData.address}\n\n` : `\n`) +
        `🛒 Заказ:\n${itemsText}\n\n` +
        `💰 ОПЛАЧЕНО: ${orderData.total} руб. ✅`;

      const BOT_TOKEN = '8754447020:AAEcItcGHk2sgrUHD_i534QmnN7HvV0GOy4';
      const CHAT_ID = '-1002342434566';
      const TOPIC_ID = '15103';

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          message_thread_id: Number(TOPIC_ID),
          text: tgMessage,
        })
      }).catch(err => console.error('Ошибка отправки в ТГ из вебхука:', err));

      console.log(`✅ Заказ #${orderId} успешно обработан вебхуком!`);
    }

    // ЮKassa требует, чтобы мы всегда отвечали 200 OK
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Критическая ошибка вебхука:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}