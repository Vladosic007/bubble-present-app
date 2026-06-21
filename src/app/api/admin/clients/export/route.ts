import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Скачивание CSV с базой клиентов
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // Ключ из query — потому что <a download> не может передать заголовок
    const key = url.searchParams.get('key');
    if (!process.env.BOSS_PASSWORD || key !== process.env.BOSS_PASSWORD) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const period = url.searchParams.get('period') || 'all';
    let sinceDate: Date | null = null;
    if (period === 'week') { sinceDate = new Date(); sinceDate.setDate(sinceDate.getDate() - 7); }
    else if (period === 'month') { sinceDate = new Date(); sinceDate.setMonth(sinceDate.getMonth() - 1); }

    let query = supabaseAdmin
      .from('orders')
      .select('customer_name, phone, address, items, total, order_type, created_at, status')
      .order('created_at', { ascending: false });
    if (sinceDate) query = query.gte('created_at', sinceDate.toISOString());

    const { data: orders } = await query;
    const clientsMap: Record<string, any> = {};

    for (const o of orders || []) {
      if (o.status === 'cancelled') continue;
      const phoneKey = (o.phone || '').replace(/\D/g, '').replace(/^8/, '7');
      if (!phoneKey) continue;

      if (!clientsMap[phoneKey]) {
        clientsMap[phoneKey] = {
          phone: o.phone, name: o.customer_name || 'Гость', address: '',
          orders_count: 0, total_spent: 0, last_order: o.created_at,
          drinks_freq: {} as Record<string, number>,
        };
      }
      const c = clientsMap[phoneKey];
      c.orders_count += 1;
      c.total_spent += Number(o.total) || 0;
      if (!c.address && o.address) c.address = o.address;
      if (new Date(o.created_at) > new Date(c.last_order)) c.last_order = o.created_at;
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

    const clients = Object.values(clientsMap).map((c: any) => {
      const favorite = Object.entries(c.drinks_freq).sort((a: any, b: any) => b[1] - a[1])[0];
      return { ...c, favorite_drink: favorite ? favorite[0] : '' };
    });
    clients.sort((a: any, b: any) => b.total_spent - a.total_spent);

    // Формируем CSV (с BOM для Excel — чтобы кириллица не ломалась)
    const header = ['Имя', 'Телефон', 'Адрес', 'Заказов', 'Потрачено (₽)', 'Средний чек (₽)', 'Любимый напиток', 'Последний заказ'];
    const rows = clients.map((c: any) => [
      c.name,
      c.phone,
      c.address || '',
      c.orders_count,
      c.total_spent,
      Math.round(c.total_spent / c.orders_count),
      c.favorite_drink,
      new Date(c.last_order).toLocaleString('ru-RU'),
    ]);

    const csv = '﻿' + [header, ...rows]
      .map(row => row.map((cell: any) => {
        const s = String(cell).replace(/"/g, '""');
        return /[",;\n]/.test(s) ? `"${s}"` : s;
      }).join(';'))
      .join('\n');

    const filename = `bubble-clients-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('clients export error', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
