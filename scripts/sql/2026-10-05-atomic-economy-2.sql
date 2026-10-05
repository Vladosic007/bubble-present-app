-- =====================================================================
--  Атомарная экономика, часть 2: спины+, разовые начисления, магазин.
--  Выполнить В SUPABASE → SQL Editor ОДИН РАЗ, ДО деплоя кода батча 3б.
-- =====================================================================

-- Атомарно добавить спины (начисление за заказ, приветственные и т.п.)
create or replace function spins_add(p_phone text, p_n integer)
returns integer language plpgsql as $$
declare new_spins integer;
begin
  update coin_balances set spins = coalesce(spins,0) + p_n, updated_at = now()
   where phone = p_phone returning spins into new_spins;
  return new_spins;
end; $$;

-- Начислить подарок на ДР ровно один раз в год. true — начислили, false — уже было в этом году.
create or replace function claim_birthday(p_phone text, p_coins integer, p_spins integer, p_year integer)
returns boolean language plpgsql as $$
begin
  update coin_balances
     set balance = greatest(0, coalesce(balance,0) + p_coins),
         spins = coalesce(spins,0) + p_spins,
         last_birthday_year = p_year,
         pending_birthday_coins = p_coins,
         updated_at = now()
   where phone = p_phone and coalesce(last_birthday_year,0) <> p_year;
  return found;
end; $$;

-- Начислить награду за новый уровень ровно один раз. true — начислили, false — уже был этот уровень.
create or replace function claim_levelup(p_phone text, p_level integer, p_reward integer)
returns boolean language plpgsql as $$
begin
  update coin_balances
     set balance = greatest(0, coalesce(balance,0) + p_reward),
         last_rewarded_level = p_level,
         pending_levelup_level = p_level,
         pending_levelup_coins = p_reward,
         updated_at = now()
   where phone = p_phone and coalesce(last_rewarded_level,1) < p_level;
  return found;
end; $$;

-- Разовые маркеры (welcome / welcome_spins) — не больше одного на телефон.
-- Сначала чистим возможные дубли (если гонка уже случалась), потом ставим уникальность.
delete from coin_transactions a using coin_transactions b
 where a.type in ('welcome','welcome_spins')
   and a.type = b.type and a.phone = b.phone and a.id > b.id;

create unique index if not exists uq_once_markers
  on coin_transactions (phone, type)
  where type in ('welcome','welcome_spins');

-- Купленная косметика — не больше одной записи на (телефон, предмет).
delete from owned_cosmetics a using owned_cosmetics b
 where a.phone = b.phone and a.item_id = b.item_id and a.ctid > b.ctid;

create unique index if not exists uq_owned_cosmetic
  on owned_cosmetics (phone, item_id);
