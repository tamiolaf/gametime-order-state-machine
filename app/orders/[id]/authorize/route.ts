import type { NextRequest } from "next/server";

import { errorResponse, json, parseSimulate, readJson } from "@/lib/http";
import { authorizePayment } from "@/lib/orders/service";
import { stubDeps } from "@/lib/payments/stub";

/**
 * POST /orders/:id/authorize
 * Optional body: { "simulate": { "authorize": "fail" } } to force a decline.
 * → 200 Order (payment_authorized or declined), 404, or 409 if not allowed from current state.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/orders/[id]/authorize">,
) {
  try {
    const { id } = await ctx.params;
    const sim = parseSimulate(await readJson(request));
    return json(await authorizePayment(id, stubDeps(sim)));
  } catch (err) {
    return errorResponse(err);
  }
}
