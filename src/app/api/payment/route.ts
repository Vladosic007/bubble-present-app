import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, description, email, items, isTest } = body;

    // ВАЖНО: берём сумму из БАЗЫ, а не от клиента
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders').select('total').eq('id', orderId).single();
    if (orderErr || !order) {
      console.error('Заказ не найден:', orderId, orderErr);
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }
    const amount = order.total;

    // === 1. ЕСЛИ ЭТО РЕЖИМ "ТЕСТ" ===
    // Возвращаем фейковый ответ, не дергая ЮKassa
    if (isTest) {
      return NextResponse.json({ is_test: true });
    }

    // === 2. БОЕВОЙ РЕЖИМ ЮKASSA ===
    const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
    const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

    const authKey = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
    const idempotenceKey = `order_${orderId}_${Date.now()}`; 

    const formattedAmount = Number(amount).toFixed(2);

    // Чек ОДНОЙ строкой на всю сумму заказа — гарантирует что сумма позиций == сумма чека
    // (исключает ошибку ЮKassa "Сумма по товарным позициям не равна сумме чека")
    const itemsCount = Array.isArray(items)
      ? items.reduce((s: number, it: any) => s + (Number(it.qty) || 1), 0)
      : 0;

    const receiptItems = [
      {
        description: `Заказ #${orderId} (напитков: ${itemsCount || 1})`.substring(0, 128),
        quantity: '1',
        amount: { value: formattedAmount, currency: 'RUB' },
        vat_code: 1,
        payment_mode: 'full_prepayment',
        payment_subject: 'commodity',
      },
    ];

    const paymentBody: any = {
      amount: {
        value: formattedAmount,
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: 'https://bubblepresent.ru/cart'
      },
      description: description,
      metadata: {
        order_id: orderId,
      },
    };

    // Чек добавляем ТОЛЬКО если email указан (требует онлайн-кассу в ЮKassa)
    if (email && email.trim() && email.includes('@')) {
      paymentBody.receipt = {
        customer: { email: email.trim() },
        items: receiptItems
      };
    }

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authKey}`,
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ ЮKASSA ВЫДАЛА ОШИБКУ:', JSON.stringify(data));
      return NextResponse.json({ error: 'ЮKassa отклонила платеж', yookassaError: data }, { status: 500 });
    }

    return NextResponse.json({ confirmation_url: data.confirmation.confirmation_url });

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА СЕРВЕРА:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}