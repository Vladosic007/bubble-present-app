import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event === 'payment.succeeded') {
      const paymentObj = body.object;
      const paymentId = paymentObj?.id;

      if (!paymentId) {
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // === ЗАЩИТА: ПРОВЕРЯЕМ ПЛАТЁЖ У ЮKASSA ===
      const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
      const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
      const authKey = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

      const verifyResponse = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        method: 'GET',
        headers: { 'Authorization': `Basic ${authKey}` },
      });

      if (!verifyResponse.ok) {
        console.error(`Webhook: ЮKassa не подтвердила платёж ${paymentId}`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const verifiedPayment = await verifyResponse.json();

      if (verifiedPayment.status !== 'succeeded') {
        console.error(`Webhook: платёж ${paymentId} статус "${verifiedPayment.status}". Игнорируем.`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const orderId = verifiedPayment.metadata?.order_id;
      if (!orderId) {
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // === 1. МЕНЯЕМ СТАТУС В БАЗЕ ===
      await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId);

      // === 2. ПОЛУЧАЕМ ДАННЫЕ ЗАКАЗА ===
      const { data: orderData } = await supabase
        .from('orders').select('*').eq('id', orderId).single();

      if (!orderData) {
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // === 3. ОТПРАВЛЯЕМ В ВК ===
      // Заказ "ко времени" — уведомление отправит планировщик за ~35 мин до времени.
      // Заказ "как можно скорее" — шлём сразу.
      if (orderData.order_time) {
        console.log(`⏰ Заказ #${orderId} ко времени ${orderData.order_time} — уведомление отложено планировщиком`);
      } else {
        await fetch(`https://www.bubblepresent.ru/api/vk-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        }).catch(err => console.error('Ошибка отправки в ВК:', err));
      }

      console.log(`✅ Заказ #${orderId} обработан (платёж ${paymentId})`);
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Ошибка вебхука:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
