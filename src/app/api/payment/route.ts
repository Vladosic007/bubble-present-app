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

    // Чек: цены позиций должны в сумме давать ровно amount (требование ЮKassa)
    // Пересчитываем пропорционально серверной сумме
    const clientSum = items.reduce((s: number, it: any) => s + Number(it.price) * Number(it.qty), 0);
    const ratio = clientSum > 0 ? amount / clientSum : 1;

    const receiptItems = items.map((item: any, idx: number) => {
      // Берём цену с пропорцией, округляем до копеек
      let perItem = Math.round(Number(item.price) * ratio * 100) / 100;
      return {
        description: item.name.substring(0, 128),
        quantity: item.qty.toString(),
        amount: { value: perItem.toFixed(2), currency: 'RUB' },
        vat_code: 1,
        payment_mode: 'full_prepayment',
        payment_subject: 'commodity'
      };
    });

    // Подгоняем последнюю позицию так, чтобы сумма чека ТОЧНО равнялась amount
    const receiptTotal = receiptItems.reduce(
      (s: number, ri: any) => s + Number(ri.amount.value) * Number(ri.quantity), 0
    );
    const diff = Math.round((amount - receiptTotal) * 100) / 100;
    if (diff !== 0 && receiptItems.length > 0) {
      const last = receiptItems[receiptItems.length - 1];
      const qty = Number(last.quantity);
      const newVal = Number(last.amount.value) + diff / qty;
      last.amount.value = (Math.round(newVal * 100) / 100).toFixed(2);
    }

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