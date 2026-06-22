import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Агрегация клиентов из таблицы orders
// Доступ — только под BOSS_PASSWORD (база клиентов = персональные данные)
export async function GET(req: Request) {
  try {
    const key = req.headers.get('x-boss-key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all'; // week | month | all
    const showHidden = url.searchParams.get('hidden') === 'true'; // показать скрытых (сотрудники/тесты)

    // Считаем дату отсечки
    let sinceDate: Date | null = null;
    if (period === 'week') {
      sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 7);
    } else if (period === 'month') {
      sinceDate = new Date();
      sinceDate.setMonth(sinceDate.getMonth() - 1);
    }

    let query = supabaseAdmin
      .from('orders')
      .select('id, customer_name, phone, address, items, total, order_type, order_time, created_at, status, source')
      .order('created_at', { ascending: false });

    if (sinceDate) {
      query = query.gte('created_at', sinceDate.toISOString());
    }

    const [{ data: orders, error }, { data: hidden }] = await Promise.all([
      query,
      supabaseAdmin.from('hidden_clients').select('phone'),
    ]);
    if (error) return NextResponse.json({ error: 'db error' }, { status: 500 });

    const hiddenSet = new Set((hidden || []).map((h: any) => h.phone));

    // Группируем по нормализованному телефону
    const clientsMap: Record<string, any> = {};

    for (const o of orders || []) {
      // Не считаем отменённые
      if (o.status === 'cancelled') continue;
      // Не считаем тестовые заказы (режим теста включается именем "ТЕСТ")
      if ((o.customer_name || '').trim().toUpperCase() === 'ТЕСТ') continue;

      const phoneKey = normalizePhone(o.phone);
      if (!phoneKey) continue;

      const isHidden = hiddenSet.has(phoneKey);
      // По умолчанию скрытых не показываем; в режиме showHidden — показываем ТОЛЬКО их
      if (showHidden ? !isHidden : isHidden) continue;

      if (!clientsMap[phoneKey]) {
        clientsMap[phoneKey] = {
          phone: o.phone,
          name: o.customer_name || 'Гость',
          address: '',
          orders_count: 0,
          total_spent: 0,
          first_order: o.created_at,
          last_order: o.created_at,
          delivery_count: 0,
          pickup_count: 0,
          drinks_freq: {} as Record<string, number>,
          weekday_freq: [0, 0, 0, 0, 0, 0, 0], // Пн..Вс
          hour_freq: {} as Record<string, number>,
          order_dates: [] as string[], // ISO даты для расчёта частоты
          history: [] as any[], // подробная история
          source_freq: {} as Record<string, number>, // откуда пришёл
        };
      }
      const c = clientsMap[phoneKey];
      c.orders_count += 1;
      c.total_spent += Number(o.total) || 0;
      const src = (o.source && String(o.source)) || 'direct';
      c.source_freq[src] = (c.source_freq[src] || 0) + 1;
      if (!c.name || c.name === 'Гость') c.name = o.customer_name || c.name;
      if (o.address && !c.address) c.address = o.address;
      if (o.order_type === 'delivery') c.delivery_count += 1;
      else c.pickup_count += 1;
      if (new Date(o.created_at) > new Date(c.last_order)) c.last_order = o.created_at;
      if (new Date(o.created_at) < new Date(c.first_order)) c.first_order = o.created_at;

      // День недели (в МСК) и час
      const d = new Date(o.created_at);
      // getDay(): 0=Вс..6=Сб → переводим в 0=Пн..6=Вс
      const jsDay = d.getDay();
      const mondayIdx = (jsDay + 6) % 7;
      c.weekday_freq[mondayIdx] += 1;
      const hour = d.getHours();
      c.hour_freq[hour] = (c.hour_freq[hour] || 0) + 1;
      c.order_dates.push(o.created_at);

      // Любимый напиток
      let itemNames: string[] = [];
      try {
        const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
        if (Array.isArray(items)) {
          for (const it of items) {
            const nm = (it.name || '').split('(')[0].trim();
            if (nm) {
              c.drinks_freq[nm] = (c.drinks_freq[nm] || 0) + (it.qty || 1);
              itemNames.push(`${it.name} x${it.qty || 1}`);
            }
          }
        }
      } catch {}

      // Подробная история заказа
      c.history.push({
        id: o.id,
        date: o.created_at,
        total: Number(o.total) || 0,
        type: o.order_type,
        time: o.order_time || null,
        items: itemNames,
      });
    }

    // Финализируем
    const clients = Object.values(clientsMap).map((c: any) => {
      const favorite = Object.entries(c.drinks_freq).sort((a: any, b: any) => b[1] - a[1])[0];
      // Топ-3 напитка
      const topDrinks = Object.entries(c.drinks_freq)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => ({ name, qty }));
      // Любимый день недели
      const maxWd = Math.max(...c.weekday_freq);
      const favWeekday = maxWd > 0 ? c.weekday_freq.indexOf(maxWd) : -1;
      // Любимое время суток
      const favHour = Object.entries(c.hour_freq).sort((a: any, b: any) => b[1] - a[1])[0];
      // Средняя частота заказов (дней между заказами)
      let avgDaysBetween = 0;
      if (c.order_dates.length >= 2) {
        const sorted = c.order_dates.map((s: string) => new Date(s).getTime()).sort((a: number, b: number) => a - b);
        let totalGap = 0;
        for (let i = 1; i < sorted.length; i++) totalGap += sorted[i] - sorted[i - 1];
        avgDaysBetween = Math.round(totalGap / (sorted.length - 1) / (1000 * 60 * 60 * 24));
      }
      // Источник клиента — самый частый
      const favSource = Object.entries(c.source_freq).sort((a: any, b: any) => b[1] - a[1])[0];

      return {
        phone: c.phone,
        name: c.name,
        address: c.address,
        orders_count: c.orders_count,
        total_spent: c.total_spent,
        avg_check: Math.round(c.total_spent / c.orders_count),
        first_order: c.first_order,
        last_order: c.last_order,
        delivery_count: c.delivery_count,
        pickup_count: c.pickup_count,
        favorite_drink: favorite ? favorite[0] : '—',
        favorite_count: favorite ? favorite[1] : 0,
        top_drinks: topDrinks,
        weekday_freq: c.weekday_freq,
        fav_weekday: favWeekday,
        fav_hour: favHour ? Number(favHour[0]) : -1,
        avg_days_between: avgDaysBetween,
        source: favSource ? favSource[0] : 'direct',
        history: c.history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      };
    });

    // Сортируем по сумме потраченного — топовые сверху
    clients.sort((a: any, b: any) => b.total_spent - a.total_spent);

    // Сводка по источникам трафика (уникальные клиенты, заказы, выручка на каждый источник)
    const srcMap: Record<string, { source: string; clients: number; orders: number; revenue: number }> = {};
    for (const c of clients as any[]) {
      const s = c.source || 'direct';
      if (!srcMap[s]) srcMap[s] = { source: s, clients: 0, orders: 0, revenue: 0 };
      srcMap[s].clients += 1;
      srcMap[s].orders += c.orders_count;
      srcMap[s].revenue += c.total_spent;
    }
    const sources = Object.values(srcMap).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      clients,
      sources,
      stats: {
        total_clients: clients.length,
        total_revenue: clients.reduce((s: number, c: any) => s + c.total_spent, 0),
        total_orders: clients.reduce((s: number, c: any) => s + c.orders_count, 0),
      },
    });
  } catch (e) {
    console.error('clients api error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').replace(/^8/, '7');
}
