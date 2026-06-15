import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'no code' }, { status: 400 });
    await supabaseAdmin.rpc('increment_promocode_usage', { code_param: code });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
