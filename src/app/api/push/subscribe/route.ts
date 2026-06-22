import { NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/push';

export async function POST(req: Request) {
  try {
    const { phone, subscription } = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ ok: false }, { status: 400 });
    await saveSubscription(phone || '', subscription);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
