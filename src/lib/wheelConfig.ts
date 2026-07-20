// === КОНФИГ РУЛЕТКИ ===
// Секторы, веса, награды. Меняешь тут — меняется везде.

export type WheelPrize =
  | { type: 'promo'; label: string; discount: number; category: string; emoji: string; color: string; weight: number }
  | { type: 'coins'; label: string; amount: number; emoji: string; color: string; weight: number };

export const WHEEL_SECTORS: WheelPrize[] = [
  // 🏆 Джекпот — напиток в подарок (100% скидка на категорию)
  { type: 'promo', label: 'НАПИТОК В ПОДАРОК!', discount: 100, category: 'Бабл милк ти', emoji: '🏆', color: '#FFD700', weight: 1 },

  // ⚡ Крупные скидки −30%
  { type: 'promo', label: '−30% Бабл-ти',    discount: 30, category: 'Бабл милк ти', emoji: '⚡', color: '#FF00EE', weight: 5 },
  { type: 'promo', label: '−30% Кофе',       discount: 30, category: 'Бабл кофе',    emoji: '⚡', color: '#FF008C', weight: 5 },
  { type: 'promo', label: '−30% Матча',      discount: 30, category: 'Бабл матча',   emoji: '⚡', color: '#00D9FF', weight: 5 },
  { type: 'promo', label: '−30% Лимонады',   discount: 30, category: 'Бабл лим',     emoji: '⚡', color: '#A24BFF', weight: 5 },

  // 🎁 Средние −20% на бабл-ти и кофе (по просьбе заказчика), остальные −15%
  { type: 'promo', label: '−20% Бабл-ти',    discount: 20, category: 'Бабл милк ти', emoji: '🎁', color: '#FF66CC', weight: 12 },
  { type: 'promo', label: '−20% Кофе',       discount: 20, category: 'Бабл кофе',    emoji: '🎁', color: '#D946EF', weight: 12 },
  { type: 'promo', label: '−15% Матча',      discount: 15, category: 'Бабл матча',   emoji: '🎁', color: '#22D3EE', weight: 12 },
  { type: 'promo', label: '−15% Лимонады',   discount: 15, category: 'Бабл лим',     emoji: '🎁', color: '#C084FC', weight: 11 },

  // 🪙 Коины
  { type: 'coins', label: '+50 коинов',      amount: 50,  emoji: '🪙', color: '#FBBF24', weight: 15 },
  { type: 'coins', label: '+100 коинов',     amount: 100, emoji: '🪙', color: '#F59E0B', weight: 12 },
  { type: 'coins', label: '+200 коинов',     amount: 200, emoji: '🪙', color: '#D97706', weight: 5 },
];

export const PROMO_LIFETIME_DAYS = 3;
export const SPINS_ON_ORDER_COMPLETED = 1;
export const SPINS_ON_BIRTHDAY = 3;
export const WELCOME_SPINS = 3;   // прокрутки новичку при регистрации (один раз)
export const SPIN_COST_COINS = 100;

// 🎂 ДЕНЬ РОЖДЕНИЯ БАБЛИКА — период когда баннер в корзине активен (МСК).
// Меняешь тут — обновляется везде (баннер, будущие акции).
export const BUBBLIK_BIRTHDAY_START = new Date('2026-07-20T00:00:00+03:00');
export const BUBBLIK_BIRTHDAY_END   = new Date('2026-07-21T00:00:00+03:00'); // до конца дня
export function isBubblikBirthday(now: Date = new Date()): boolean {
  return now >= BUBBLIK_BIRTHDAY_START && now < BUBBLIK_BIRTHDAY_END;
}

// Розыгрыш с учётом весов. Возвращает индекс сектора.
export function pickSector(): number {
  const total = WHEEL_SECTORS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL_SECTORS.length; i++) {
    r -= WHEEL_SECTORS[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}
