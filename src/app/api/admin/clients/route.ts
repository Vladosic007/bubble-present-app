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
      .select('id, customer_name, phone, address, items, total, order_type, created_at, status')
      .order('created_at', { ascending: false });

    if (sinceDate) {
      query = query.gte('created_at', sinceDate.toISOString());
    }

    const { data: orders, error } = await query;
    if (error) return NextResponse.json({ error: 'db error' }, { status: 500 });

    // Группируем по нормализованному телефону
    const clientsMap: Record<string, any> = {};

    for (const o of orders || []) {
      // Не считаем отменённые
      if (o.status === 'cancelled') continue;

      const phoneKey = normalizePhone(o.phone);
      if (!phoneKey) continue;

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
        };
      }
      const c = clientsMap[phoneKey];
      c.orders_count += 1;
      c.total_spent += Number(o.total) || 0;
      // Самое последнее имя/адрес — берём из самого свежего заказа (orders отсортированы DESC)
      if (!c.name || c.name === 'Гость') c.name = o.customer_name || c.name;
      if (o.address && !c.address) c.address = o.address;
      if (o.order_type === 'delivery') c.delivery_count += 1;
      else c.pickup_count += 1;
      if (new Date(o.created_at) > new Date(c.last_order)) c.last_order = o.created_at;
      if (new Date(o.created_at) < new Date(c.first_order)) c.first_order = o.created_at;

      // Любимый напиток — считаем частоту названий
      try {
        const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
        if (Array.isArray(items)) {
          for (const it of items) {
            const nm = (it.name || '').split('(')[0].trim();
            if (nm) c.drinks_freq[nm] = (c.drinks_freq[nm] || 0) + (it.qty || 1);
          }
        }
      } catch {}
    }

    // Финализируем — вычисляем любимый напиток и средний чек
    const clients = Object.values(clientsMap).map((c: any) => {
      const favorite = Object.entries(c.drinks_freq).sort((a: any, b: any) => b[1] - a[1])[0];
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
      };
    });

    // Сортируем по сумме потраченного — топовые сверху
    clients.sort((a: any, b: any) => b.total_spent - a.total_spent);

    return NextResponse.json({
      clients,
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
