// === ЕДИНЫЙ КОНФИГ ЛОЯЛЬНОСТИ: УРОВНИ + СКИДКИ + БАБЛКОИНЫ ===
// Один источник правды для клиента (баблик, корзина, страница коинов) и сервера
// (расчёт цены, начисление/списание коинов). Меняешь тут — меняется везде.

// --- УРОВНИ БАБЛИКА ---
// minCups — минимум выпитых напитков для уровня. Пороги совпадают со страницей баблика.
// discount — постоянная скидка уровня (%).
export type LevelConfig = { level: number; minCups: number; discount: number };
export const LEVELS: LevelConfig[] = [
  { level: 1, minCups: 0,  discount: 0 },
  { level: 2, minCups: 10, discount: 5 },
  { level: 3, minCups: 21, discount: 6 },
  { level: 4, minCups: 32, discount: 7 },
  { level: 5, minCups: 54, discount: 8 },
  { level: 6, minCups: 65, discount: 9 },
  { level: 7, minCups: 76, discount: 10 },
  { level: 8, minCups: 98, discount: 11 },
];

// Уровень по числу выпитых напитков
export function levelForCups(cups: number) {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (cups >= l.minCups) result = l;
    else break;
  }
  return result;
}

// Скидка уровня (%) по числу напитков
export function levelDiscountForCups(cups: number): number {
  return levelForCups(cups).discount;
}

// --- БАБЛКОИНЫ ---
export const COIN_EARN_RUBLES_PER_COIN = 10; // 10₽ в оплаченном заказе = 1 коин
export const COIN_REDEEM_VALUE = 1;          // 1 коин = 1₽ скидки
export const COIN_MAX_REDEEM_FRACTION = 0.5; // коинами можно покрыть не больше 50% заказа
export const WELCOME_COINS = 50;             // приветственные коины новичку
export const LEVELUP_COINS_MIN = 1;          // награда за уровень: рандом от...
export const LEVELUP_COINS_MAX = 100;        // ...до
export const TOTAL_DISCOUNT_CAP_FRACTION = 0.5; // общий потолок суммарной скидки (50%)

// Сколько коинов начислить за оплаченную сумму
export function coinsForAmount(paidRubles: number): number {
  if (!paidRubles || paidRubles <= 0) return 0;
  return Math.floor(paidRubles / COIN_EARN_RUBLES_PER_COIN);
}

// Сколько максимум коинов можно списать в заказе на сумму orderTotal,
// учитывая баланс и потолок 50%
export function maxRedeemableCoins(balance: number, orderTotal: number): number {
  const maxByOrder = Math.floor((orderTotal * COIN_MAX_REDEEM_FRACTION) / COIN_REDEEM_VALUE);
  return Math.max(0, Math.min(balance, maxByOrder));
}

// Случайная награда за левел-ап (1..100)
export function randomLevelupReward(): number {
  return Math.floor(Math.random() * (LEVELUP_COINS_MAX - LEVELUP_COINS_MIN + 1)) + LEVELUP_COINS_MIN;
}
