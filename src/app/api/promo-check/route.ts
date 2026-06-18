import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Проверка промокода (без раскрытия других кодов)
export async function POST(req: Request) {
  try {
    const { code, items } = await req.json();
    if (!code) return NextResponse.json({ error: 'no code' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('promocodes').select('*')
      .eq('code', code.trim().toUpperCase()).single();

    if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (!data.is_active) return NextResponse.json({ error: 'inactive' }, { status: 400 });
    if (data.usage_limit && data.used_count >= data.usage_limit) {
      return NextResponse.json({ error: 'limit' }, { status: 400 });
    }
    // Срок действия
    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    // Проверка что в корзине есть напитки, подходящие под applies_to
    if (data.applies_to && Array.isArray(items) && items.length > 0) {
      const eligible = items.some((it: any) => isItemEligible(it, data.applies_to));
      if (!eligible) {
        return NextResponse.json({ error: 'not_applicable' }, { status: 400 });
      }
    }

    return NextResponse.json({
      code: data.code,
      discount: data.discount_percent,
      applies_to: data.applies_to || null,
      valid_until: data.valid_until || null,
    });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

// Проверка применим ли промокод к конкретной позиции
function isItemEligible(item: any, appliesTo: string): boolean {
  if (!appliesTo) return true;
  // Формат: "drink:<slug>" или "category:<название>"
  if (appliesTo.startsWith('drink:')) {
    const slug = appliesTo.slice(6).toLowerCase();
    return (item.slug || item.id || '').toString().toLowerCase() === slug;
  }
  if (appliesTo.startsWith('category:')) {
    const cat = appliesTo.slice(9).toLowerCase();
    return (item.category || '').toString().toLowerCase() === cat;
  }
  return false;
}
