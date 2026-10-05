import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { coinsForAmount, levelForCups, WELCOME_COINS, BIRTHDAY_COINS, REFERRAL_INVITER_COINS, REFERRAL_FRIEND_COINS, randomLevelupReward } from '@/lib/loyaltyConfig';
import { getCosmetic, boosterMultById, DEFAULT_EQUIPPED } from '@/lib/cosmetics';
import { sendToPhone } from '@/lib/push';
import { SPINS_ON_ORDER_COMPLETED, SPINS_ON_BIRTHDAY, WELCOME_SPINS } from '@/lib/wheelConfig';

// === СЕРВЕРНАЯ ЛОГИКА БАБЛКОИНОВ ===
// Баланс хранится по нормализованному телефону, все операции пишутся в леджер.

export function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').replace(/^8/, '7');
}

// Получить (или создать) строку баланса
async function getRow(phoneNorm: string) {
  const { data } = await supabaseAdmin.from('coin_balances').select('*').eq('phone', phoneNorm).single();
  if (data) return data;
  const { data: created } = await supabaseAdmin
    .from('coin_balances')
    .insert({ phone: phoneNorm, balance: 0, last_rewarded_level: 1 })
    .select()
    .single();
  return created;
}

export async function getBalance(phoneNorm: string): Promise<number> {
  const row = await getRow(phoneNorm);
  return row?.balance || 0;
}

// Применить изменение баланса + записать в леджер.
// Начисление/списание делает база атомарно (coins_add) — без гонок при параллельных запросах.
async function applyDelta(phoneNorm: string, delta: number, type: string, orderId: number | null, note = '') {
  await getRow(phoneNorm); // гарантируем, что строка есть
  const { data: newBalance } = await supabaseAdmin.rpc('coins_add', { p_phone: phoneNorm, p_delta: delta });
  await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: delta, type, order_id: orderId, note });
  return Number(newBalance) || 0;
}

// Была ли уже операция такого типа по этому заказу (защита от двойного срабатывания)
async function hasTxForOrder(phoneNorm: string, orderId: number, type: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('coin_transactions')
    .select('id')
    .eq('phone', phoneNorm)
    .eq('order_id', orderId)
    .eq('type', type)
    .limit(1);
  return !!(data && data.length);
}

// Приветственный бонус — выдаётся один раз на телефон
export async function ensureWelcomeBonus(phoneNorm: string): Promise<void> {
  if (!phoneNorm) return;
  await getRow(phoneNorm); // гарантируем строку баланса
  // Маркер-замок: уникальный индекс (phone,type) не даст вставить второй раз.
  // Если вставка не прошла — бонус уже выдавали, выходим.
  const { error } = await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: WELCOME_COINS, type: 'welcome', order_id: null, note: 'Приветственный бонус' });
  if (error) return;
  await supabaseAdmin.rpc('coins_add', { p_phone: phoneNorm, p_delta: WELCOME_COINS });
}

// Приветственные ПРОКРУТКИ рулетки — один раз на телефон (независимо от коинов).
// Покрывает и новых, и тех кто зарегался недавно (получат при след. открытии).
export async function ensureWelcomeSpins(phoneNorm: string): Promise<void> {
  if (!phoneNorm) return;
  await getRow(phoneNorm);
  // Маркер-замок первым: дубликат отсечёт уникальный индекс.
  const { error } = await supabaseAdmin
    .from('coin_transactions').insert({ phone: phoneNorm, amount: 0, type: 'welcome_spins', order_id: null, note: 'Приветственные прокрутки' });
  if (error) return; // уже выдавали
  await supabaseAdmin.rpc('spins_add', { p_phone: phoneNorm, p_n: WELCOME_SPINS });
}

// Сохранить дату рождения клиента (формат YYYY-MM-DD)
export async function setBirthday(phoneNorm: string, birthday: string): Promise<void> {
  if (!phoneNorm) return;
  await getRow(phoneNorm); // гарантируем, что строка есть
  await supabaseAdmin
    .from('coin_balances')
    .update({ birthday })
    .eq('phone', phoneNorm);
}

// Текущая дата по МСК
function mskTodayParts(): { mmdd: string; year: number } {
  const now = new Date();
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(now);
  const day = p.find(x => x.type === 'day')?.value || '01';
  const month = p.find(x => x.type === 'month')?.value || '01';
  const year = Number(p.find(x => x.type === 'year')?.value || '2026');
  return { mmdd: `${month}-${day}`, year };
}

// Проверить и начислить подарок на день рождения (один раз в год). Возвращает сумму или 0.
export async function checkBirthdayBonus(phoneNorm: string): Promise<number> {
  if (!phoneNorm) return 0;
  const row = await getRow(phoneNorm);
  if (!row?.birthday || row.birthday.length < 10) return 0;
  const bdayMMDD = row.birthday.slice(5); // "YYYY-MM-DD" → "MM-DD"
  const { mmdd, year } = mskTodayParts();
  if (bdayMMDD !== mmdd) return 0;
  if (row.last_birthday_year === year) return 0; // в этом году уже дарили (быстрый выход)

  // Атомарно: начислит только если в этом году ещё не дарили. false — уже успели (гонка).
  const { data: granted } = await supabaseAdmin.rpc('claim_birthday', {
    p_phone: phoneNorm, p_coins: BIRTHDAY_COINS, p_spins: SPINS_ON_BIRTHDAY, p_year: year,
  });
  if (!granted) return 0;

  await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: BIRTHDAY_COINS, type: 'birthday', order_id: null, note: 'Подарок на день рождения 🎂' });
  sendToPhone(phoneNorm, { title: '🎂 С Днём Рождения!', body: `Лови подарок — ${BIRTHDAY_COINS} баблкоинов 🪙`, url: '/coins' }).catch(() => {});
  return BIRTHDAY_COINS;
}

// === РЕФЕРАЛКА ===

// Получить (или сгенерировать) личный реферальный код пользователя
export async function getOrCreateRefCode(phoneNorm: string): Promise<string> {
  const row = await getRow(phoneNorm);
  if (row?.ref_code) return row.ref_code;
  // генерируем короткий код
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = Math.random().toString(36).slice(2, 8);
    const { data: taken } = await supabaseAdmin.from('coin_balances').select('phone').eq('ref_code', code).limit(1);
    if (!taken || taken.length === 0) break;
  }
  await supabaseAdmin.from('coin_balances').update({ ref_code: code }).eq('phone', phoneNorm);
  return code;
}

// Привязать новичка к пригласившему (только один раз, нельзя пригласить самого себя)
export async function setReferredBy(phoneNorm: string, code: string): Promise<void> {
  if (!phoneNorm || !code) return;
  const row = await getRow(phoneNorm);
  if (row?.referred_by) return;            // уже привязан
  if (row?.ref_code === code) return;      // нельзя пригласить себя
  // код должен принадлежать реальному пользователю
  const { data: inviter } = await supabaseAdmin.from('coin_balances').select('phone').eq('ref_code', code).limit(1);
  if (!inviter || inviter.length === 0) return;
  await supabaseAdmin.from('coin_balances').update({ referred_by: code }).eq('phone', phoneNorm);
}

// Обработать реферальную награду при ПЕРВОМ завершённом заказе новичка
async function processReferralOnComplete(phoneNorm: string, phoneRaw: string): Promise<void> {
  const row = await getRow(phoneNorm);
  if (!row?.referred_by || row.referral_rewarded) return;

  // Проверяем, что это действительно первый завершённый заказ (защита от абуза)
  const { data: completed } = await supabaseAdmin
    .from('orders').select('id').eq('phone', phoneRaw).eq('status', 'completed');
  if (!completed || completed.length > 1) return; // больше одного — клиент не новый

  // Находим пригласившего по коду
  const { data: inviterRows } = await supabaseAdmin
    .from('coin_balances').select('phone').eq('ref_code', row.referred_by).limit(1);
  if (!inviterRows || inviterRows.length === 0) return;
  const inviterPhone = inviterRows[0].phone;
  if (inviterPhone === phoneNorm) return; // сам себя

  // Награждаем обоих + помечаем, что реферал отработан
  await supabaseAdmin.from('coin_balances').update({ referral_rewarded: true }).eq('phone', phoneNorm);
  await applyDelta(phoneNorm, REFERRAL_FRIEND_COINS, 'referral', null, 'Бонус за приход по приглашению');
  await applyDelta(inviterPhone, REFERRAL_INVITER_COINS, 'referral', null, 'Друг пришёл по твоей ссылке 🎉');
  sendToPhone(inviterPhone, { title: '🤝 +50 коинов!', body: 'Друг пришёл по твоей ссылке и сделал заказ. Спасибо! 🪙', url: '/coins' }).catch(() => {});
}

// === МАГАЗИН КОСМЕТИКИ ===

// Множитель прогресса по надетому бустеру
export async function getBoosterMult(phoneNorm: string): Promise<number> {
  if (!phoneNorm) return 1;
  const row = await getRow(phoneNorm);
  return boosterMultById(row?.equipped_booster);
}

// Что надето + что куплено + баланс
export async function getShopState(phoneNorm: string) {
  const [row, ownedRes] = await Promise.all([
    getRow(phoneNorm),
    supabaseAdmin.from('owned_cosmetics').select('item_id').eq('phone', phoneNorm),
  ]);
  const owned = (ownedRes.data || []).map((o: any) => o.item_id);
  return {
    balance: row?.balance || 0,
    owned,
    equipped: {
      aura: row?.equipped_aura || DEFAULT_EQUIPPED.aura,
      name: row?.equipped_name || DEFAULT_EQUIPPED.name,
      bg: row?.equipped_bg || DEFAULT_EQUIPPED.bg,
      booster: row?.equipped_booster || DEFAULT_EQUIPPED.booster,
    },
  };
}

// Купить предмет
export async function buyCosmetic(phoneNorm: string, itemId: string): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const item = getCosmetic(itemId);
  if (!item) return { ok: false, error: 'not_found' };
  if (item.price <= 0) return { ok: false, error: 'free' }; // бесплатные не покупаются
  await getRow(phoneNorm);
  // Быстрый выход, если уже куплено (на случай гонки подстрахует уникальный индекс ниже).
  const { data: existing } = await supabaseAdmin
    .from('owned_cosmetics').select('item_id').eq('phone', phoneNorm).eq('item_id', itemId).limit(1);
  if (existing && existing.length) return { ok: false, error: 'already_owned' };

  // АТОМАРНО списываем цену — только если хватает.
  const { data: spent } = await supabaseAdmin.rpc('coins_spend', { p_phone: phoneNorm, p_amount: item.price });
  if (spent === null || Number(spent) < 0) return { ok: false, error: 'not_enough' };

  // Отмечаем покупку. Уникальный индекс (phone,item_id) не даст купить дважды параллельно.
  const { error: insErr } = await supabaseAdmin.from('owned_cosmetics').insert({ phone: phoneNorm, item_id: itemId });
  if (insErr) {
    // Параллельный запрос уже купил этот предмет — возвращаем деньги.
    await supabaseAdmin.rpc('coins_add', { p_phone: phoneNorm, p_delta: item.price });
    return { ok: false, error: 'already_owned' };
  }
  await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: -item.price, type: 'shop', order_id: null, note: `Покупка: ${item.title}` });
  return { ok: true, balance: Number(spent) };
}

// Надеть предмет (бесплатные можно надевать без покупки)
export async function equipCosmetic(phoneNorm: string, itemId: string): Promise<{ ok: boolean; error?: string }> {
  const item = getCosmetic(itemId);
  if (!item) return { ok: false, error: 'not_found' };
  if (item.price > 0) {
    const { data: existing } = await supabaseAdmin
      .from('owned_cosmetics').select('item_id').eq('phone', phoneNorm).eq('item_id', itemId).limit(1);
    if (!existing || !existing.length) return { ok: false, error: 'not_owned' };
  }
  const col =
    item.category === 'aura' ? 'equipped_aura' :
    item.category === 'name' ? 'equipped_name' :
    item.category === 'bg' ? 'equipped_bg' : 'equipped_booster';
  await getRow(phoneNorm);
  await supabaseAdmin.from('coin_balances').update({ [col]: itemId }).eq('phone', phoneNorm);
  return { ok: true };
}

// Списать коины при оформлении заказа
export async function redeemForOrder(phoneNorm: string, coins: number, orderId: number): Promise<void> {
  if (!phoneNorm || coins <= 0) return;
  if (await hasTxForOrder(phoneNorm, orderId, 'order_redeem')) return;
  await applyDelta(phoneNorm, -coins, 'order_redeem', orderId, `Списано в заказе #${orderId}`);
}

// Сколько напитков выпито (по completed заказам, точное совпадение телефона — как на баблике)
export async function getCups(phoneRaw: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('items')
    .eq('phone', phoneRaw)
    .eq('status', 'completed');
  let cups = 0;
  (data || []).forEach((o: any) => {
    try {
      JSON.parse(o.items).forEach((it: any) => { cups += it.qty || 0; });
    } catch {}
  });
  return cups;
}

// Напитки с учётом бустера (ускоряет прогресс баблика)
export async function getEffectiveCups(phoneRaw: string, phoneNorm: string): Promise<number> {
  const raw = await getCups(phoneRaw);
  const mult = await getBoosterMult(phoneNorm);
  return Math.floor(raw * mult);
}

// Проверка левел-апа: если уровень вырос — начисляем рандом 1..100 и ставим pending для показа окна
async function checkLevelup(phoneNorm: string, phoneRaw: string): Promise<void> {
  const cups = await getEffectiveCups(phoneRaw, phoneNorm);
  const level = levelForCups(cups).level;
  const row = await getRow(phoneNorm);
  const lastRewarded = row?.last_rewarded_level || 1;
  if (level <= lastRewarded) return;

  const reward = randomLevelupReward();
  // Атомарно: начислит только если этот уровень ещё не награждали. false — уже успели (гонка).
  const { data: granted } = await supabaseAdmin.rpc('claim_levelup', {
    p_phone: phoneNorm, p_level: level, p_reward: reward,
  });
  if (!granted) return;

  await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: reward, type: 'levelup', order_id: null, note: `Левел-ап до уровня ${level}` });
  sendToPhone(phoneRaw, { title: '✨ Новый уровень!', body: `Баблик дорос до уровня ${level}! Тебе +${reward} коинов 🪙`, url: '/coins' }).catch(() => {});
}

// Главный хук: вызывается когда заказ становится "completed"
// Начисляет коины за оплаченную сумму + проверяет левел-ап. Идемпотентно.
export async function handleOrderCompleted(orderId: number): Promise<void> {
  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('phone, total, customer_name')
      .eq('id', orderId)
      .single();
    if (!order || !order.phone) return;
    // тестовые заказы не считаем
    if ((order.customer_name || '').trim().toUpperCase() === 'ТЕСТ') return;

    const phoneNorm = normalizePhone(order.phone);
    if (!phoneNorm) return;

    // начисление за заказ (один раз)
    if (!(await hasTxForOrder(phoneNorm, orderId, 'order_earn'))) {
      const earn = coinsForAmount(Number(order.total) || 0);
      if (earn > 0) await applyDelta(phoneNorm, earn, 'order_earn', orderId, `Заказ #${orderId}`);
      // + прокрутка рулетки за каждый завершённый заказ (атомарно)
      if (SPINS_ON_ORDER_COMPLETED > 0) {
        await supabaseAdmin.rpc('spins_add', { p_phone: phoneNorm, p_n: SPINS_ON_ORDER_COMPLETED });
      }
    }

    // левел-ап (cups считаем по уже завершённому заказу)
    await checkLevelup(phoneNorm, order.phone);

    // реферальная награда (если это первый завершённый заказ новичка)
    await processReferralOnComplete(phoneNorm, order.phone);
  } catch (e) {
    console.error('handleOrderCompleted error', e);
  }
}
