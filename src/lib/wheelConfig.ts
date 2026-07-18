// === КОНФИГ РУЛЕТКИ ===
// Секторы, веса, награды. Меняешь тут — меняется везде.

export type WheelPrize =
  | { type: 'promo'; label: string; discount: number; category: string; emoji: string; color: string; weight: number }
  | { type: 'coins'; label: string; amount: number; emoji: string; color: string; weight: number }
  | { type: 'respin'; label: string; emoji: string; color: string; weight: number };

export const WHEEL_SECTORS: WheelPrize[] = [
  { type: 'promo', label: '−10% Бабл-ти',   discount: 10, category: 'Бабл милк ти', emoji: '🧋', color: '#FF00EE', weight: 15 },
  { type: 'coins', label: '+10 коинов',     amount: 10,   emoji: '🪙', color: '#FFD700', weight: 20 },
  { type: 'promo', label: '−15% Кофе',      discount: 15, category: 'Бабл кофе',    emoji: '☕', color: '#FF008C', weight: 10 },
  { type: 'respin', label: 'Крути ещё!',    emoji: '🔄', color: '#14FF00', weight: 15 },
  { type: 'promo', label: '−12% Матча',     discount: 12, category: 'Бабл матча',   emoji: '🍵', color: '#00D9FF', weight: 12 },
  { type: 'coins', label: '+20 коинов',     amount: 20,   emoji: '🪙', color: '#FFD700', weight: 15 },
  { type: 'promo', label: '−10% Лимонады',  discount: 10, category: 'Бабл лим',     emoji: '🍋', color: '#A24BFF', weight: 10 },
  { type: 'coins', label: '+5 коинов',      amount: 5,    emoji: '🪙', color: '#FFD700', weight: 3  },
];

export const PROMO_LIFETIME_DAYS = 3;                  // персональный промокод живёт 3 дня
export const SPINS_ON_ORDER_COMPLETED = 1;             // +1 прокрутка за завершённый заказ
export const SPINS_ON_BIRTHDAY = 3;                    // пакет на ДР баблика
export const SPIN_COST_COINS = 50;                     // цена прокрутки за коины

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
