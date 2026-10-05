-- =====================================================================
--  Атомарные операции с баблкоинами и спинами (защита от накруток).
--  Выполнить В SUPABASE → SQL Editor ОДИН РАЗ, ДО деплоя нового кода.
--
--  Зачем: раньше код делал "прочитал баланс → посчитал → записал".
--  Параллельные запросы успевали прочитать одно и то же старое значение
--  и из одного спина/списания получалось несколько. Теперь списание и
--  начисление делает сама база одной командой — гонку выиграть нельзя.
-- =====================================================================

-- Списать 1 спин, если он есть. Возвращает остаток спинов, или -1 если спинов не было.
create or replace function wheel_consume_spin(p_phone text)
returns integer
language plpgsql
as $$
declare new_spins integer;
begin
  update coin_balances
     set spins = spins - 1, updated_at = now()
   where phone = p_phone and coalesce(spins, 0) >= 1
   returning spins into new_spins;
  if not found then
    return -1;  -- спинов не было
  end if;
  return new_spins;
end;
$$;

-- Начислить коины (delta>0) или списать с полом в 0 (delta<0). Возвращает новый баланс.
create or replace function coins_add(p_phone text, p_delta integer)
returns integer
language plpgsql
as $$
declare new_balance integer;
begin
  update coin_balances
     set balance = greatest(0, coalesce(balance, 0) + p_delta), updated_at = now()
   where phone = p_phone
   returning balance into new_balance;
  return new_balance;  -- null, если строки нет (вызывающий гарантирует наличие)
end;
$$;

-- Списать ровно p_amount, только если хватает. Возвращает новый баланс, или -1 если не хватило.
create or replace function coins_spend(p_phone text, p_amount integer)
returns integer
language plpgsql
as $$
declare new_balance integer;
begin
  update coin_balances
     set balance = balance - p_amount, updated_at = now()
   where phone = p_phone and coalesce(balance, 0) >= p_amount
   returning balance into new_balance;
  if not found then
    return -1;  -- не хватило
  end if;
  return new_balance;
end;
$$;

-- Купить 1 прокрутку за p_cost: атомарно списать коины и добавить спин.
-- Возвращает строку (balance, spins) при успехе; пусто — если не хватило коинов.
create or replace function wheel_buy_spin(p_phone text, p_cost integer)
returns table(balance integer, spins integer)
language plpgsql
as $$
begin
  return query
  update coin_balances cb
     set balance = cb.balance - p_cost,
         spins = coalesce(cb.spins, 0) + 1,
         updated_at = now()
   where cb.phone = p_phone and coalesce(cb.balance, 0) >= p_cost
   returning cb.balance, cb.spins;
end;
$$;
