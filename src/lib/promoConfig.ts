// === АКЦИЯ: -50% НА ДОСТАВКУ (только сегодня) ===
// Единый источник правды для клиента (корзина, меню, баннер, попап) и сервера (расчёт + проверка цены).
// Меняешь дату тут — меняется везде сразу. Продлить акцию = сдвинуть FRIDAY_PROMO_END.
export const FRIDAY_PROMO_START = new Date('2026-09-16T00:00:00+03:00'); // среда 16.09.2026, 00:00 МСК
export const FRIDAY_PROMO_END = new Date('2026-09-17T00:00:00+03:00');   // конец дня 16.09 (вкл.) → четверг 17.09 00:00 МСК, акция выключается
export const FRIDAY_PROMO_DISCOUNT = 50; // процент скидки
export const FRIDAY_PROMO_LABEL = 'Только сегодня'; // подпись в баннерах

// Множитель цены во время акции (0.5 = -50%)
export const FRIDAY_PROMO_MULTIPLIER = 1 - FRIDAY_PROMO_DISCOUNT / 100;

// Активна ли акция прямо сейчас (по серверному/клиентскому времени)
export function isFridayDeliveryPromoActive(now: Date = new Date()): boolean {
  return now >= FRIDAY_PROMO_START && now < FRIDAY_PROMO_END;
}

// Цена для витрины с учётом акции (сервер всё равно пересчитывает сам)
export function deliveryPromoPrice(price: number, orderType: string, promoActive: boolean): number {
  return promoActive && orderType === 'delivery' ? Math.round(price * FRIDAY_PROMO_MULTIPLIER) : price;
}
