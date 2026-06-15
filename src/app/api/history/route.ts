import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) return NextResponse.json({ orders: [] });

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
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
