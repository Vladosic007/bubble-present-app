import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Категории, которые в тестовом режиме — доступны только под boss-ключом.
// Меняешь тут — открываешь клиентам.
const RESTRICTED_CATEGORIES = new Set(['Азиатка', 'Десерты']);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const bossKey = req.headers.get('x-boss-key');
    const isBoss = !!process.env.BOSS_PASSWORD && bossKey === process.env.BOSS_PASSWORD;

    // Тестовые категории — только для босса
    if (category && RESTRICTED_CATEGORIES.has(category) && !isBoss) {
      return NextResponse.json({ drinks: [] });
    }

    let q = supabaseAdmin.from('drinks').select('*').eq('is_active', true).order('id', { ascending: true });
    if (category) {
      q = q.eq('category', category);
    } else if (!isBoss) {
      // Общий запрос без категории — тоже скрываем тестовые
      q = q.not('category', 'in', `(${[...RESTRICTED_CATEGORIES].map(c => `"${c}"`).join(',')})`);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ drinks: [] });
    return NextResponse.json({ drinks: data || [] });
  } catch {
    return NextResponse.json({ drinks: [] });
  }
}
