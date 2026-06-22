import { NextResponse } from 'next/server';
import { getPublicKey } from '@/lib/push';

export async function GET() {
  return NextResponse.json({ key: getPublicKey() });
}
