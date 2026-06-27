// Простой in-memory счётчик неудачных попыток (защита от брутфорса PIN).
// Работает в рамках одного процесса (pm2) — для нашей нагрузки достаточно.

const fails = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 10 * 60 * 1000; // окно 10 минут
const MAX_FAILS = 12;             // после 12 неверных попыток за окно — блок

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export function isBlocked(key: string): boolean {
  const rec = fails.get(key);
  if (!rec || Date.now() > rec.reset) return false;
  return rec.count >= MAX_FAILS;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const rec = fails.get(key);
  if (!rec || now > rec.reset) fails.set(key, { count: 1, reset: now + WINDOW_MS });
  else rec.count++;
}

export function clearFailures(key: string): void {
  fails.delete(key);
}
