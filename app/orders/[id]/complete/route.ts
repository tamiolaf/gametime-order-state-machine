import type { NextRequest } from "next/server";

import { errorResponse, json, parseSimulate, readJson } from "@/lib/http";
import { completeOrder } from "@/lib/orders/service";
import { stubDeps } from "@/lib/payments/stub";

/**
 * POST /orders/:id/complete
 * Optional body: { "simulate": { "complete": "fail", "void": "fail" } }
 * → 200 Order (complete, cancelled, or needs_attention), 404, or 409.
 *
 * Note: a failed completion still returns 200 — the *request* succeeded in
 * driving the order to a well-defined state; the outcome is in `state`.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/orders/[id]/complete">,
) {
  try {
    const { id } = await ctx.params;
    const sim = parseSimulate(await readJson(request));
    return json(await completeOrder(id, stubDeps(sim)));
  } catch (err) {
    return errorResponse(err);
  }
}
