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
  
  // ❗ МАССИВ АКТИВНЫХ ЗАКАЗОВ (РАЗРЕШАЕМ НЕСКОЛЬКО) ❗
  activeOrders: { id: number; status: string; time: number }[];

  setOrderType: (type: 'delivery' | 'pickup') => void;
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  changeQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;

  // ❗ МЕТОДЫ ДЛЯ МНОЖЕСТВЕННЫХ ЗАКАЗОВ ❗
  addActiveOrder: (id: number, status: string, time: number) => void;
  removeActiveOrder: (id: number) => void;
  updateOrderStatus: (id: number, status: string) => void;
}

// === САМО ХРАНИЛИЩЕ (С ПАМЯТЬЮ ЛОКАЛСТОРАДЖА) ===
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      orderType: 'pickup',
      
      activeOrders: [],

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

      // Функции управления МАССИВОМ активных заказов
      addActiveOrder: (id, status, time) => set((state) => ({ 
        activeOrders: [...state.activeOrders, { id, status, time }] 
      })),
      
      removeActiveOrder: (id) => set((state) => ({ 
        activeOrders: state.activeOrders.filter(order => order.id !== id) 
      })),
      
      updateOrderStatus: (id, status) => set((state) => ({ 
        activeOrders: state.activeOrders.map(order => 
          order.id === id ? { ...order, status } : order
        )
      }))
    }),
    {
      name: 'bubblik-storage', // ❗ Сохраняем всё в память телефона ❗
    }
  )
);