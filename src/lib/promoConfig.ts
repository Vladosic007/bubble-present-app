// === АКЦИЯ: -25% НА ДОСТАВКУ (неделя) ===
// Единый источник правды для клиента (корзина) и сервера (расчёт + проверка цены).
// Меняешь дату тут — меняется везде сразу.
export const FRIDAY_PROMO_START = new Date('2026-06-26T00:00:00+03:00'); // пятница 26.06.2026, 00:00 МСК
export const FRIDAY_PROMO_END = new Date('2026-07-04T00:00:00+03:00');   // конец пятницы 03.07.2026 (вкл.) → суббота 04.07 00:00 МСК, акция выключается
export const FRIDAY_PROMO_DISCOUNT = 25; // процент скидки

// Множитель цены во время акции (0.75 = -25%)
export const FRIDAY_PROMO_MULTIPLIER = 1 - FRIDAY_PROMO_DISCOUNT / 100;

// Активна ли акция прямо сейчас (по серверному/клиентскому времени)
export function isFridayDeliveryPromoActive(now: Date = new Date()): boolean {
  return now >= FRIDAY_PROMO_START && now < FRIDAY_PROMO_END;
}
