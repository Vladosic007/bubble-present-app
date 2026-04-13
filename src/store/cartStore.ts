import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// === ТИПЫ ДАННЫХ ===
export interface CartItem {
  cartItemId: string; 
  id: number;         
  name: string;
  price: number;
  quantity: number;
  img: string;
  size: string;
  toppings: string[];
}

interface CartState {
  items: CartItem[];
  orderType: 'delivery' | 'pickup';
  
  // ❗ ПОЛЯ ДЛЯ АКТИВНОГО ЗАКАЗА (ТРЕКИНГА) ❗
  activeOrderId: number | null;
  activeOrderStatus: string;
  orderCreatedAt: number | null; 

  setOrderType: (type: 'delivery' | 'pickup') => void;
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  changeQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;

  // ❗ НОВЫЕ МЕТОДЫ ДЛЯ ЗАКАЗА ❗
  setActiveOrder: (id: number, status: string, time: number) => void;
  clearActiveOrder: () => void;
  updateOrderStatus: (status: string) => void;
}

// === САМО ХРАНИЛИЩЕ (С ПАМЯТЬЮ ЛОКАЛСТОРАДЖА) ===
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      orderType: 'pickup',
      
      activeOrderId: null,
      activeOrderStatus: 'none',
      orderCreatedAt: null,

      setOrderType: (type) => set({ orderType: type }),
      
      addItem: (item) => set((state) => ({ 
        items: [...state.items, item] 
      })),
      
      removeItem: (id) => set((state) => ({ 
        items: state.items.filter((i) => i.cartItemId !== id) 
      })),
      
      changeQuantity: (id, delta) => set((state) => ({
        items: state.items.map((i) => 
          i.cartItemId === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        )
      })),
      
      clearCart: () => set({ items: [] }),

      // Функции управления активным заказом
      setActiveOrder: (id, status, time) => set({ 
        activeOrderId: id, 
        activeOrderStatus: status, 
        orderCreatedAt: time 
      }),
      
      clearActiveOrder: () => set({ 
        activeOrderId: null, 
        activeOrderStatus: 'none', 
        orderCreatedAt: null 
      }),
      
      updateOrderStatus: (status) => set({ activeOrderStatus: status })
    }),
    {
      name: 'bubblik-storage', // ❗ Сохраняем всё в память телефона ❗
    }
  )
);