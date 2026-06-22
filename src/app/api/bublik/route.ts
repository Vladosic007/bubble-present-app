import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizePhone, getBoosterMult } from '@/lib/coins';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ cups: 0 });

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('items')
      .eq('phone', phone)
      .eq('status', 'completed');

    if (error || !data) {
      return NextResponse.json({ cups: 0 });
    }

    let totalCups = 0;
    data.forEach(order => {
      try {
        const parsed = JSON.parse(order.items);
        parsed.forEach((item: any) => { totalCups += item.qty; });
      } catch {}
    });

    // Бустер ускоряет прогресс баблика
    const mult = await getBoosterMult(normalizePhone(phone));
    const effectiveCups = Math.floor(totalCups * mult);

    return NextResponse.json({ cups: effectiveCups, rawCups: totalCups, mult });
  } catch (e) {
    return NextResponse.json({ cups: 0 });
  }
}
