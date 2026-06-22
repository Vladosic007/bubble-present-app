// === КАТАЛОГ КОСМЕТИКИ ДЛЯ БАБЛИКА ===
// Единый источник правды. Цены/предметы меняются тут.
// category: aura (свечение), name (цвет имени), bg (фон), booster (ускоритель прогресса)

export type CosmeticCategory = 'aura' | 'name' | 'bg' | 'booster';

export type Cosmetic = {
  id: string;
  category: CosmeticCategory;
  title: string;
  emoji: string;
  price: number;     // 0 = бесплатно (по умолчанию, доступно сразу)
  value: string;     // цвет / CSS-градиент / 'default'
  mult?: number;     // множитель прогресса (для booster)
};

export const COSMETICS: Cosmetic[] = [
  // --- Ауры (цвет свечения вокруг баблика) ---
  { id: 'aura_pink',    category: 'aura', title: 'Розовая',    emoji: '💗', price: 0,   value: '#FF008C' },
  { id: 'aura_ice',     category: 'aura', title: 'Ледяная',    emoji: '❄️', price: 150, value: '#00D9FF' },
  { id: 'aura_emerald', category: 'aura', title: 'Изумрудная', emoji: '💚', price: 150, value: '#14FF7A' },
  { id: 'aura_purple',  category: 'aura', title: 'Фиолетовая', emoji: '💜', price: 150, value: '#A24BFF' },
  { id: 'aura_fire',    category: 'aura', title: 'Огненная',   emoji: '🔥', price: 200, value: '#FF5A1F' },

  // --- Цвет имени баблика ---
  { id: 'name_white',   category: 'name', title: 'Белое',      emoji: '⚪', price: 0,   value: '#FFFFFF' },
  { id: 'name_gold',    category: 'name', title: 'Золотое',    emoji: '🟡', price: 100, value: '#FFD700' },
  { id: 'name_neon',    category: 'name', title: 'Неон',       emoji: '🟢', price: 100, value: '#39FF14' },
  { id: 'name_rainbow', category: 'name', title: 'Радужное',   emoji: '🌈', price: 150, value: 'linear-gradient(90deg,#FF00EE,#00D9FF,#14FF7A,#FFD700)' },

  // --- Фоны (CSS-градиенты) ---
  { id: 'bg_cosmos', category: 'bg', title: 'Космос',    emoji: '🌌', price: 0,   value: 'default' },
  { id: 'bg_neon',   category: 'bg', title: 'Неон-сити', emoji: '🌃', price: 250, value: 'linear-gradient(160deg,#0A0014,#3A0CA3,#F72585)' },
  { id: 'bg_sunset', category: 'bg', title: 'Закат',     emoji: '🌅', price: 200, value: 'linear-gradient(160deg,#2A0845,#6441A5,#FF7E5F)' },
  { id: 'bg_ocean',  category: 'bg', title: 'Океан',     emoji: '🌊', price: 200, value: 'linear-gradient(160deg,#001F3F,#0074D9,#7FDBFF)' },

  // --- Бустеры (ускоряют прогресс баблика) ---
  { id: 'booster_12', category: 'booster', title: 'Турбо ×1.2', emoji: '🚀', price: 300,  value: '1.2', mult: 1.2 },
  { id: 'booster_15', category: 'booster', title: 'Турбо ×1.5', emoji: '⚡', price: 700,  value: '1.5', mult: 1.5 },
  { id: 'booster_2',  category: 'booster', title: 'Турбо ×2',   emoji: '👑', price: 1000, value: '2',   mult: 2.0 },
];

export function getCosmetic(id: string | null | undefined): Cosmetic | undefined {
  if (!id) return undefined;
  return COSMETICS.find(c => c.id === id);
}

// Множитель прогресса по надетому бустеру (1 если нет)
export function boosterMultById(id: string | null | undefined): number {
  const c = getCosmetic(id);
  return c && c.category === 'booster' && c.mult ? c.mult : 1;
}

// Дефолтные (бесплатные) предметы — доступны без покупки
export const DEFAULT_EQUIPPED: Record<CosmeticCategory, string> = {
  aura: 'aura_pink',
  name: 'name_white',
  bg: 'bg_cosmos',
  booster: '',
};
