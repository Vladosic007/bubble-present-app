import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Инициализируем Supabase безопасно
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const BOT_TOKEN = '8754447020:AAEcItcGHk2sgrUHD_i534QmnN7HvV0GOy4';
const CHAT_ID = '-1002342434566';
const TOPIC_ID = '15103';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🔔 Получено уведомление от ЮKassa:', body.event);

    if (body.event === 'payment.succeeded') {
      const payment = body.object;
      const orderId = payment.metadata?.order_id;

      if (orderId) {
        // Меняем статус на "accepted" (Принят)
        const { error: dbError } = await supabase
          .from('orders')
          .update({ status: 'accepted' })
          .eq('id', orderId);

        if (dbError) throw dbError;

        // Шлем радостную весть баристе
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            message_thread_id: TOPIC_ID,
            text: `💰 ЗАКАЗ #${orderId} ОПЛАЧЕН!\nБабки на базе, начинай готовить! 🧋`
          }),
        });
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}