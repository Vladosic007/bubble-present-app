import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const key = req.headers.get('x-admin-key');
    if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
