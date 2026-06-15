import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-admin-key');
    if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: 'no id' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('toppings')
      .update({ is_active })
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'db error' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
