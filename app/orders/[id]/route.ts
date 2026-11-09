import type { NextRequest } from "next/server";

import { errorResponse, json } from "@/lib/http";
import { getOrder } from "@/lib/orders/service";

/** GET /orders/:id → Order (current state + full history) */
export async function GET(_req: NextRequest, ctx: RouteContext<"/orders/[id]">) {
  try {
    const { id } = await ctx.params;
    return json(getOrder(id));
  } catch (err) {
    return errorResponse(err);
  }
}
