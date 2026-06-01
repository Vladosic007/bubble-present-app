import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ❗ Слушаем только событие "Оплата прошла успешно" ❗
    if (body.event === 'payment.succeeded') {
      const paymentObj = body.object;
      const paymentId = paymentObj?.id;

      if (!paymentId) {
        console.error('Webhook: нет payment_id');
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // === ЗАЩИТА: ПРОВЕРЯЕМ ПЛАТЁЖ НАПРЯМУЮ У ЮKASSA ===
      const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
      const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
      const authKey = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

      const verifyResponse = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authKey}`,
        },
      });

      if (!verifyResponse.ok) {
        console.error(`Webhook: ЮKassa не подтвердила платёж ${paymentId}, статус ${verifyResponse.status}`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const verifiedPayment = await verifyResponse.json();

      // Проверяем что платёж реально оплачен
      if (verifiedPayment.status !== 'succeeded') {
        console.error(`Webhook: платёж ${paymentId} имеет статус "${verifiedPayment.status}", а не "succeeded". Игнорируем.`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Достаем ID заказа из подтверждённого платежа (не из webhook body!)
      const orderId = verifiedPayment.metadata?.order_id;

      if (!orderId) {
        console.error('Webhook: ЮKassa не прислала order_id в metadata');
        return NextResponse.json({ success: true }, { status: 200 });
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

      // === 2. ПОЛУЧАЕМ ДАННЫЕ ЗАКАЗА ===
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !orderData) {
        console.error(`Ошибка получения заказа #${orderId} из базы:`, fetchError);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // === 3. ФОРМИРУЕМ ТЕКСТ ===
      const itemsText = (() => {
        try {
          const parsed = JSON.parse(orderData.items);
          return parsed.map((i: any) => `▫️ ${i.name} x${i.qty}`).join('\n');
        } catch {
          return orderData.items;
        }
      })();

      const tgMessage = `🚨 НОВЫЙ ОПЛАЧЕННЫЙ ЗАКАЗ #${orderId} 🚨\n\n` +
        `📦 Тип: ${orderData.order_type === 'delivery' ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ'}\n` +
        `👤 Имя: ${orderData.customer_name}\n` +
        `📞 Телефон: ${orderData.phone}\n` +
        (orderData.order_type === 'delivery' ? `📍 Адрес: ${orderData.address}\n\n` : `\n`) +
        `🛒 Заказ:\n${itemsText}\n\n` +
        `💰 ОПЛАЧЕНО: ${orderData.total} руб. ✅`;

      // === 4. ОТПРАВЛЯЕМ В ТЕЛЕГРАМ ===
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          message_thread_id: Number(process.env.TELEGRAM_TOPIC_ID),
          text: tgMessage,
        })
      }).catch(err => console.error('Ошибка отправки в ТГ:', err));

      // === 5. ОТПРАВЛЯЕМ КУРЬЕРУ В ВК ===
      const vkMessage = `🚨 НОВЫЙ ЗАКАЗ #${orderId} 🚨\n\n` +
        `📦 ${orderData.order_type === 'delivery' ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ'}\n` +
        `👤 ${orderData.customer_name}\n` +
        `📞 ${orderData.phone}\n` +
        (orderData.order_type === 'delivery' ? `📍 ${orderData.address}\n\n` : `\n`) +
        `🛒 ${itemsText}\n\n` +
        `💰 Оплачено: ${orderData.total} руб. ✅`;

      await fetch(`https://www.bubblepresent.ru/api/vk-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderText: vkMessage }),
      }).catch(err => console.error('Ошибка отправки в ВК:', err));

      console.log(`✅ Заказ #${orderId} успешно обработан (платёж ${paymentId} подтверждён)`);
    }

    // ЮKassa требует 200 OK всегда
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Критическая ошибка вебхука:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
