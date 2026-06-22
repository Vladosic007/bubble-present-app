import { NextResponse } from 'next/server';
import { sendBroadcast } from '@/lib/push';

// Рассылка пуша всем подписчикам (только босс)
export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { title, body, url } = await req.json();
    if (!title || !body) return NextResponse.json({ error: 'empty' }, { status: 400 });
    const sent = await sendBroadcast({ title: String(title).slice(0, 80), body: String(body).slice(0, 160), url: url || '/' });
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
