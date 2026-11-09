import type { Order } from "@/lib/orders/types";

export type Result = { ok: true } | { ok: false; error: string };

export interface PaymentGateway {
  /** Place a hold on the buyer's card. */
  authorize(order: Order): Promise<Result>;
  /** Release a previously authorized hold. */
  void(order: Order): Promise<Result>;
}

/**
 * Completing the order (e.g. transferring tickets from the seller). Separate
 * from payments because a completion failure is a different failure than a
 * payment failure, and needs different recovery.
 */
export interface FulfillmentService {
  complete(order: Order): Promise<Result>;
}

export interface OrderDeps {
  payments: PaymentGateway;
  fulfillment: FulfillmentService;
}
