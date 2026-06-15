import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Активные топпинги — для клиентов (страницы напитков)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('toppings').select('name').eq('is_active', true);
    if (error) return NextResponse.json({ toppings: [] });
    return NextResponse.json({ toppings: data || [] });
  } catch {
    return NextResponse.json({ toppings: [] });
  }
}
