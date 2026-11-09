import type { Order } from "@/lib/orders/types";

const g = globalThis as unknown as { __orders?: Map<string, Order> };
const orders = (g.__orders ??= new Map<string, Order>());

export const store = {
  get: (id: string) => orders.get(id),
  has: (id: string) => orders.has(id),
  list: () => [...orders.values()],
  save: (order: Order) => {
    orders.set(order.id, order);
    return order;
  },
  /** Test helper. */
  reset: () => orders.clear(),
};
