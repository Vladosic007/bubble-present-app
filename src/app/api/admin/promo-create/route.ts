import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { code, discount_percent, usage_limit, applies_to, valid_until } = await req.json();
    if (!code || !discount_percent) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const insertRow: any = {
      code,
      discount_percent,
      usage_limit: usage_limit || null,
      applies_to: applies_to || null,        // null = на всё меню; "category:..." | "drink:..."
      valid_until: valid_until || null,      // null = бессрочно
    };

    const { data, error } = await supabaseAdmin
      .from('promocodes')
      .insert([insertRow])
      .select();

    if (error || !data) {
      return NextResponse.json({ error: 'db error' }, { status: 500 });
    }

    return NextResponse.json({ promo: data[0] });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
