import { NextResponse } from 'next/server';
import { normalizePhone, buyCosmetic } from '@/lib/coins';

export async function POST(req: Request) {
  try {
    const { phone, itemId } = await req.json();
    const phoneNorm = normalizePhone(phone || '');
    if (!phoneNorm || !itemId) return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 });
    const res = await buyCosmetic(phoneNorm, itemId);
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}
