import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { coinsForAmount, levelForCups, WELCOME_COINS, randomLevelupReward } from '@/lib/loyaltyConfig';

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

// Применить изменение баланса + записать в леджер
async function applyDelta(phoneNorm: string, delta: number, type: string, orderId: number | null, note = '') {
  const row = await getRow(phoneNorm);
  const newBalance = Math.max(0, (row?.balance || 0) + delta);
  await supabaseAdmin
    .from('coin_balances')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('phone', phoneNorm);
  await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: delta, type, order_id: orderId, note });
  return newBalance;
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
  const { data } = await supabaseAdmin
    .from('coin_transactions')
    .select('id')
    .eq('phone', phoneNorm)
    .eq('type', 'welcome')
    .limit(1);
  if (data && data.length) return; // уже выдавали
  await applyDelta(phoneNorm, WELCOME_COINS, 'welcome', null, 'Приветственный бонус');
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

// Проверка левел-апа: если уровень вырос — начисляем рандом 1..100 и ставим pending для показа окна
async function checkLevelup(phoneNorm: string, phoneRaw: string): Promise<void> {
  const cups = await getCups(phoneRaw);
  const level = levelForCups(cups).level;
  const row = await getRow(phoneNorm);
  const lastRewarded = row?.last_rewarded_level || 1;
  if (level <= lastRewarded) return;

  const reward = randomLevelupReward();
  const newBalance = Math.max(0, (row?.balance || 0) + reward);
  await supabaseAdmin
    .from('coin_balances')
    .update({
      balance: newBalance,
      last_rewarded_level: level,
      pending_levelup_level: level,
      pending_levelup_coins: reward,
      updated_at: new Date().toISOString(),
    })
    .eq('phone', phoneNorm);
  await supabaseAdmin
    .from('coin_transactions')
    .insert({ phone: phoneNorm, amount: reward, type: 'levelup', order_id: null, note: `Левел-ап до уровня ${level}` });
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
    }

    // левел-ап (cups считаем по уже завершённому заказу)
    await checkLevelup(phoneNorm, order.phone);
  } catch (e) {
    console.error('handleOrderCompleted error', e);
  }
}
