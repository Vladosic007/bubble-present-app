import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { clientIp, tooManyRequests } from '@/lib/rateLimit';

// История заказов клиента по номеру телефона.
// ВАЖНО: отдаём только то, что нужно странице истории. Адрес, имя, телефон и
// прочие поля НЕ возвращаем — иначе любой по чужому номеру увидел бы адрес доставки.
export async function GET(req: Request) {
  try {
    // Лимит частоты — чтобы нельзя было массово перебирать чужие номера.
    if (tooManyRequests('history:' + clientIp(req), 60, 60_000)) {
      return NextResponse.json({ orders: [] }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ orders: [] });

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, order_type, items, total, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json({ orders: data });
  } catch (e) {
    return NextResponse.json({ orders: [] });
  }
}
