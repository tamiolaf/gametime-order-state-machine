import { nanoid } from "nanoid";

import { store } from "@/lib/orders/store";
import { canTransition, transition } from "@/lib/orders/stateMachine";
import {
  Order,
  OrderNotFoundError,
  OrderState,
  TransitionError,
} from "@/lib/orders/types";
import type { OrderDeps } from "@/lib/payments/types";

/**
 * Order service: orchestrates external calls (payments, fulfillment) and
 * decides which state to move to. The state machine (`transition`) enforces
 * that the move is legal; this layer decides *which* move to make.
 */

export function createOrder(name: string): Order {
  // Random ids (vs. a counter) so ids aren't guessable / enumerable.
  let id = nanoid();
  while (store.has(id)) id = nanoid();

  const now = new Date().toISOString();
  return store.save({
    id,
    name,
    state: OrderState.INITIALIZED,
    createdAt: now,
    updatedAt: now,
    history: [{ from: null, to: OrderState.INITIALIZED, timestamp: now }],
  });
}

export function getOrder(id: string): Order {
  const order = store.get(id);
  if (!order) throw new OrderNotFoundError(id);
  return order;
}

export function listOrders(): Order[] {
  return store.list();
}

/**
 * Guard an action before any side effect runs. Checking only after the
 * external call would mean e.g. charging a card for an already-complete order
 * and only then discovering the transition is illegal.
 */
function assertCanEnter(order: Order, target: OrderState): void {
  if (!canTransition(order.state, target)) {
    throw new TransitionError(order.state, target);
  }
}

export async function authorizePayment(
  id: string,
  deps: OrderDeps,
): Promise<Order> {
  const order = getOrder(id);
  assertCanEnter(order, OrderState.PAYMENT_AUTHORIZED);

  const auth = await deps.payments.authorize(order);

  // Authorize payment if auth is accepted
  if (auth.ok) {
    return store.save(
      transition(order, OrderState.PAYMENT_AUTHORIZED, {
        reason: "payment authorized",
      }),
    );
  }

  return store.save(
    transition(order, OrderState.DECLINED, {
      reason: "payment declined",
      error: auth.error,
    }),
  );
}

/**
 * payment_authorized → complete         (fulfillment ok)
 * payment_authorized → cancelled        (fulfillment failed, void ok)
 * payment_authorized → needs_attention  (fulfillment failed AND void failed)
 *
 * @throws OrderNotFoundError, TransitionError (if not in `payment_authorized`)
 */
export async function completeOrder(
  id: string,
  deps: OrderDeps,
): Promise<Order> {
  const order = getOrder(id);
  assertCanEnter(order, OrderState.COMPLETE);

  const completion = await deps.fulfillment.complete(order);

  if (completion.ok) {
    return store.save(
      transition(order, OrderState.COMPLETE, { reason: "order completed" }),
    );
  }

  // Payment is held but the fan won't get tickets — release the hold.
  const voided = await deps.payments.void(order);

  if (voided.ok) {
    return store.save(
      transition(order, OrderState.CANCELLED, {
        reason: "completion failed; payment voided",
        error: completion.error,
      }),
    );
  }

  // Partial failure: the fan may still be charged. Don't claim a clean
  // cancel — park it for manual resolution and keep both errors visible.
  console.error(
    `[order ${order.id}] needs_attention: completion failed (${completion.error}); void failed (${voided.error})`,
  );
  return store.save(
    transition(order, OrderState.NEEDS_ATTENTION, {
      reason: "completion failed; void failed — manual resolution required",
      error: `completion: ${completion.error}; void: ${voided.error}`,
    }),
  );
}
