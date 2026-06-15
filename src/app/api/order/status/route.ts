import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'no id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('status, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ status: data.status, created_at: data.created_at });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
