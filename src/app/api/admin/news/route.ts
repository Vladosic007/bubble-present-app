import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function checkBoss(req: Request): boolean {
  const key = req.headers.get('x-boss-key');
  return !!process.env.BOSS_PASSWORD && key === process.env.BOSS_PASSWORD;
}

// Список ВСЕХ новостей (в т.ч. выключенных) — для админки
export async function GET(req: Request) {
  if (!checkBoss(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from('news').select('*').order('sort', { ascending: false }).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
  return NextResponse.json({ news: data || [] });
}

// Создать новость
export async function POST(req: Request) {
  if (!checkBoss(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    const row = {
      title: String(b.title || '').slice(0, 120),
      text: String(b.text || '').slice(0, 500),
      image: String(b.image || '').slice(0, 300),
      gradient: String(b.gradient || '').slice(0, 200),
      link: String(b.link || '').slice(0, 300),
      is_active: b.is_active !== false,
      is_popup: !!b.is_popup,
      sort: Number(b.sort) || 0,
    };
    if (!row.title) return NextResponse.json({ error: 'no_title' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('news').insert(row).select().single();
    if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

// Обновить новость (частично)
export async function PATCH(req: Request) {
  if (!checkBoss(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'no_id' }, { status: 400 });
    const patch: any = {};
    for (const k of ['title', 'text', 'image', 'gradient', 'link', 'is_active', 'is_popup', 'sort']) {
      if (k in b) patch[k] = b[k];
    }
    const { error } = await supabaseAdmin.from('news').update(patch).eq('id', b.id);
    if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

// Удалить новость
export async function DELETE(req: Request) {
  if (!checkBoss(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 });
    const { error } = await supabaseAdmin.from('news').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
