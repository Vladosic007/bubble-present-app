import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Список промокодов — только для босса (раньше читалось публичным ключом = утечка кодов)
export async function GET(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { data, error } = await supabaseAdmin
      .from('promocodes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'db error' }, { status: 500 });
    return NextResponse.json({ promocodes: data || [] });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
