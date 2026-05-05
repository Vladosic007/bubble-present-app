import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ❗ Добавили tgMessage и isTest, которые прилетят с телефона
    const { orderId, amount, description, email, items, tgMessage, isTest } = body;

    // === 1. ЕСЛИ ЭТО РЕЖИМ "ТЕСТ" ===
    // Возвращаем фейковый ответ, не дергая ЮKassa
    if (isTest) {
      return NextResponse.json({ is_test: true });
    }

    // === 2. БОЕВОЙ РЕЖИМ ЮKASSA ===
    const SHOP_ID = '1115596';
    const SECRET_KEY = 'live_D2hcQYGW5-1cxXfj670DxCbteiISpkPm2d2WYwbBo7o';

    const authKey = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
    const idempotenceKey = `order_${orderId}_${Date.now()}`; 

    const formattedAmount = Number(amount).toFixed(2);

    const receiptItems = items.map((item: any) => ({
      description: item.name.substring(0, 128),
      quantity: item.qty.toString(),
      amount: {
        value: Number(item.price).toFixed(2),
        currency: 'RUB'
      },
      vat_code: 1, 
      payment_mode: 'full_prepayment',
      payment_subject: 'commodity'
    }));

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authKey}`,
        'Idempotence-Key': idempotenceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          value: formattedAmount,
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: 'https://bubble-present-app-2f9f.vercel.app/cart', 
        },
        description: description,
        receipt: {
          customer: {
            email: email 
          },
          items: receiptItems
        },
        metadata: {
          order_id: orderId,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ ЮKASSA ВЫДАЛА ОШИБКУ:', data);
      return NextResponse.json({ error: 'ЮKassa отклонила платеж', details: data }, { status: 500 });
    }

    return NextResponse.json({ confirmation_url: data.confirmation.confirmation_url });

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА СЕРВЕРА:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}