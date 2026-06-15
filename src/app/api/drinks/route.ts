import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Публичный список напитков — для клиентов
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let q = supabaseAdmin.from('drinks').select('*').eq('is_active', true).order('id', { ascending: true });
    if (category) q = q.eq('category', category);

    const { data, error } = await q;
    if (error) return NextResponse.json({ drinks: [] });
    return NextResponse.json({ drinks: data || [] });
  } catch {
    return NextResponse.json({ drinks: [] });
  }
}
