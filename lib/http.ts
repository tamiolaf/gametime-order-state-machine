import { OrderNotFoundError, TransitionError } from "@/lib/orders/types";
import type { SimulateOptions } from "@/lib/payments/stub";

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status });

export class BadRequestError extends Error {}

/** Map domain errors to HTTP responses. Unknown errors are 500s and get logged. */
export function errorResponse(err: unknown): Response {
  if (err instanceof OrderNotFoundError) return json({ error: err.message }, 404);
  if (err instanceof TransitionError) return json({ error: err.message }, 409);
  if (err instanceof BadRequestError) return json({ error: err.message }, 400);
  console.error(err);
  return json({ error: "Internal server error" }, 500);
}

/** Parse a JSON body; an empty body is treated as {}. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const body = JSON.parse(text);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new BadRequestError("Body must be a JSON object");
    }
    return body;
  } catch (e) {
    if (e instanceof BadRequestError) throw e;
    throw new BadRequestError("Malformed JSON body");
  }
}

/** Pull `{ simulate: { authorize?, complete?, void? } }` out of a body, ignoring junk. */
export function parseSimulate(body: Record<string, unknown>): SimulateOptions {
  const sim = body.simulate;
  if (typeof sim !== "object" || sim === null) return {};
  const out: SimulateOptions = {};
  for (const key of ["authorize", "complete", "void"] as const) {
    const v = (sim as Record<string, unknown>)[key];
    if (v === "ok" || v === "fail") out[key] = v;
  }
  return out;
}
