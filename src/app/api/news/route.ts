import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Публичный список активных новостей (для карусели и попапа)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('news')
      .select('id, title, text, image, gradient, link, is_popup, sort')
      .eq('is_active', true)
      .order('sort', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ news: [] });
    return NextResponse.json({ news: data || [] });
  } catch {
    return NextResponse.json({ news: [] });
  }
}
