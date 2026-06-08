import type { MetadataRoute } from 'next';

const BASE = 'https://bubblepresent.ru';

// Все страницы напитков и категорий
const menuRoutes = [
  '/menu/tea', '/menu/coffee', '/menu/lim', '/menu/matcha',
  '/menu/coffee/bumble', '/menu/coffee/cheese-raf1', '/menu/coffee/cheesecake1',
  '/menu/coffee/choco-banana1', '/menu/coffee/dubai1', '/menu/coffee/exploding-caramel1',
  '/menu/coffee/halva1', '/menu/coffee/pretty-in-pink1', '/menu/coffee/rot-front1',
  '/menu/coffee/snickers1', '/menu/coffee/straw-basil', '/menu/coffee/toffee-boom1',
  '/menu/lim/banana-lim1', '/menu/lim/caramel-rasp1', '/menu/lim/emerald-breeze1',
  '/menu/lim/mojito1', '/menu/lim/raiesan1', '/menu/lim/sorrel',
  '/menu/matcha/matcha-pistachio1', '/menu/matcha/matcha-raspberry1', '/menu/matcha/pink-sakura1',
  '/menu/tea/berry-mix1', '/menu/tea/blueberry1', '/menu/tea/bubble-milk1',
  '/menu/tea/caraoke1', '/menu/tea/choco-straw1', '/menu/tea/citrus1',
  '/menu/tea/forest-berries1', '/menu/tea/frost-blueberry1', '/menu/tea/jasmine-kiwi1',
  '/menu/tea/jasmine-lime1', '/menu/tea/jasmine-rasp1', '/menu/tea/jasmine-straw1',
  '/menu/tea/nutella1', '/menu/tea/oreo1', '/menu/tea/passion-soda1',
  '/menu/tea/pomegranate1', '/menu/tea/rasp-cloud1', '/menu/tea/red-currant1',
  '/menu/tea/red-dragon1', '/menu/tea/sea-buckthorn1', '/menu/tea/tai-lung1',
  '/menu/tea/taro1', '/menu/tea/thai-orange1', '/menu/tea/velvet1',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const main = [
    { url: BASE, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${BASE}/bubblik`, priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  const menu = menuRoutes.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    ...main.map((m) => ({ ...m, lastModified: now })),
    ...menu,
  ];
}
