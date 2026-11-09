import { nanoid } from "nanoid";

const OrderState = {
  INITIALIZED: "initialized",
  PAYMENT_AUTHORIZED: "payment_authorized",
  CANCELLED: "cancelled",
  COMPLETE: "complete",
  DECLINED: "declined",
  NEEDS_ATTENTION: "needs_attention",
} as const;

type OrderState = (typeof OrderState)[keyof typeof OrderState];

export interface Order {
  state: OrderState;
  createdAt: number;
  name: string;
  id: string;
}

export const orderMap = new Map<string, Order>();

export async function POST(request: Request) {
  // Parse the request body
  const body = await request.json();
  const { name } = body;

  // e.g. Insert new user into your DB
  let orderId = nanoid();

  // checking for collisions
  // using random id genrator over a counter so that ids won't be pre-generated.
  while (orderMap.has(orderId)) {
    orderId = nanoid();
  }

  const newOrder: Order = {
    createdAt: Date.now(),
    name,
    id: orderId,
    state: OrderState.INITIALIZED,
  };

  orderMap.set(orderId, newOrder);

  return new Response(JSON.stringify(newOrder), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request) {
  console.log(orderMap.toString());

  // TODO: write serialize function here
  return new Response(JSON.stringify(Object.fromEntries(orderMap.entries())), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
