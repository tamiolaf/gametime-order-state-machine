import { orderMap, Order } from "@/app/orders/route";

import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;

  return new Response(JSON.stringify(orderMap.get(id)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;

  const body = await request.json();
  const { state } = body;

  const existingOrder = orderMap.get(id);

  if (!existingOrder) {
    return new Response("No order found", {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: handle case where state is empty
  const updatedOrder = { ...existingOrder, state };
  orderMap.set(id, updatedOrder);

  return new Response(JSON.stringify(orderMap.get(id)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
