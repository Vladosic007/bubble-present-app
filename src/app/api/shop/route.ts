import { NextResponse } from 'next/server';
import { normalizePhone, getShopState } from '@/lib/coins';

// Состояние магазина для пользователя: баланс, что куплено, что надето
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneNorm = normalizePhone(searchParams.get('phone') || '');
    if (!phoneNorm) return NextResponse.json({ balance: 0, owned: [], equipped: null });
    const state = await getShopState(phoneNorm);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ balance: 0, owned: [], equipped: null });
  }
}
