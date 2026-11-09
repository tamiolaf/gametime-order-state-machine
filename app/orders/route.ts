import { BadRequestError, errorResponse, json, readJson } from "@/lib/http";
import { createOrder, listOrders } from "@/lib/orders/service";

/** POST /orders  { name: string } → 201 Order */
export async function POST(request: Request) {
  try {
    const { name } = await readJson(request);
    if (typeof name !== "string" || !name.trim()) {
      throw new BadRequestError("`name` is required");
    }
    return json(createOrder(name.trim()), 201);
  } catch (err) {
    return errorResponse(err);
  }
}

/** GET /orders → Order[] */
export async function GET() {
  return json(listOrders());
}
