import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Возвращает активные (не завершённые) заказы по номеру телефона.
// Используется чтобы после оплаты/перезагрузки страницы клиент видел свои заказы.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ orders: [] });

    // Берём заказы за последние 6 часов которые не завершены/не отменены
    const sinceISO = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at')
      .eq('phone', phone)
      .gte('created_at', sinceISO)
      .not('status', 'in', '(completed,cancelled)')
      .order('created_at', { ascending: false });

    if (error || !data) return NextResponse.json({ orders: [] });

    const orders = data.map((o: any) => ({
      id: o.id,
      status: o.status,
      time: new Date(o.created_at).getTime(),
    }));

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
