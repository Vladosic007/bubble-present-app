import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Проверка промокода (без раскрытия других кодов)
export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'no code' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('promocodes').select('code, discount_percent, is_active, usage_limit, used_count')
      .eq('code', code.trim().toUpperCase()).single();

    if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (!data.is_active) return NextResponse.json({ error: 'inactive' }, { status: 400 });
    if (data.usage_limit && data.used_count >= data.usage_limit) {
      return NextResponse.json({ error: 'limit' }, { status: 400 });
    }

    return NextResponse.json({ code: data.code, discount: data.discount_percent });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
