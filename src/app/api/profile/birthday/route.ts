import { NextResponse } from 'next/server';
import { normalizePhone, setBirthday } from '@/lib/coins';

// Сохранить дату рождения клиента (для бонуса в ДР)
export async function POST(req: Request) {
  try {
    const { phone, birthday } = await req.json();
    const phoneNorm = normalizePhone(phone || '');
    // birthday ожидаем как YYYY-MM-DD
    if (!phoneNorm || !birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await setBirthday(phoneNorm, birthday);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
