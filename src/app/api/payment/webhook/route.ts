import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Инициализация базы данных
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Твои ключи
const BOT_TOKEN = '8754447020:AAEcItcGHk2sgrUHD_i534QmnN7HvV0GOy4';
const CHAT_ID = '-1002342434566';
const TOPIC_ID = '15103';
const FUSION_TOKEN = 'c5ec567fbee9822bbfc96b757cdbca2e35084ebd';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Слушаем только успешные оплаты от ЮKassa
    if (body.event === 'payment.succeeded') {
      const payment = body.object;
      const orderId = payment.metadata?.order_id;

      if (orderId) {
        // 1. Достаем заказ из базы
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        // Если заказ найден и он все еще висит как неоплаченный
        if (orderData && orderData.status === 'pending_payment') {
          
          // 2. ОБНОВЛЯЕМ СТАТУС В БАЗЕ (Сайт юзера сразу это увидит и покажет "Заказ оформлен")
          await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId);

          // 3. ОТПРАВЛЯЕМ В ТЕЛЕГРАМ (Теперь 100% оплаченный!)
          const itemsList = JSON.parse(orderData.items).map((item: any) => `▪️ ${item.name} x${item.qty}`).join('\n');
          
          const tgMessage = `
🚨 НОВЫЙ ОПЛАЧЕННЫЙ ЗАКАЗ #${orderId} 🚨
✅ ДЕНЬГИ ПОЛУЧЕНЫ (ЮKassa)

📦 Тип: ${orderData.order_type === 'delivery' ? '🚗 ДОСТАВКА' : '🏃 САМОВЫВОЗ'}
👤 Имя: ${orderData.customer_name}
📞 Телефон: ${orderData.phone}
${orderData.order_type === 'delivery' ? `📍 Адрес: ${orderData.address}\n` : ''}
🛒 Заказ:
${itemsList}

💰 Итого: ${orderData.total} руб.
          `;

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, message_thread_id: TOPIC_ID, text: tgMessage })
          });

          // 4. ОТПРАВЛЯЕМ В FUSION POS
          const cleanPhone = orderData.phone.replace(/\D/g, '').replace(/^8/, '7');
          const d = new Date(); d.setMinutes(d.getMinutes() + 40); 
          const fusionDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

          const fusionItems = JSON.parse(orderData.items).map((item: any) => ({
            menu_id: 1, qty: item.qty, menu_price: item.price
          }));

          const fusionPayload: any = {
            id_point: 1, comment: itemsList, 
            delivery_method: orderData.order_type === 'delivery' ? 'delivery' : 'onstore',
            originalOrderId: `site_${orderId}`, id_order_remote_source: orderId,
            receiver_phone: cleanPhone, receiver_name: orderData.customer_name,
            items: fusionItems, client: { name: orderData.customer_name, lastname: "Клиент", phone: cleanPhone }
          };

          if (orderData.order_type === 'delivery') {
            fusionPayload.delivery_date = fusionDate; fusionPayload.city = "Таганрог"; fusionPayload.street = orderData.address || "Не указана"; fusionPayload.house = 1; 
          }

          await fetch('https://bubble-present.fusion24.ru/api/v2/remote-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FUSION_TOKEN}` },
            body: JSON.stringify(fusionPayload)
          });
        }
      }
    }
    
    // Обязательно отвечаем ЮКассе, что мы всё поняли, иначе она будет долбить нас запросами
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Ошибка Webhook:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}