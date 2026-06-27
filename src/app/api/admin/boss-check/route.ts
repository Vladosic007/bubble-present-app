import { NextResponse } from 'next/server';
import { clientIp, isBlocked, recordFailure, clearFailures } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = 'boss:' + clientIp(req);
    if (isBlocked(ip)) {
      return NextResponse.json({ ok: false, error: 'too_many' }, { status: 429 });
    }
    const { pin } = await req.json();
    if (!process.env.BOSS_PASSWORD || pin !== process.env.BOSS_PASSWORD) {
      recordFailure(ip);
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    clearFailures(ip);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
