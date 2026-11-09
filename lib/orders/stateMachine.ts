import {
  Order,
  OrderState,
  StateTransition,
  TransitionError,
} from "@/lib/orders/types";

const orderState = OrderState;

/* Determines which state changes are legal
 * Every state change in the system must go through `transition()`.
 * Terminal states (complete, declined, cancelled) have no outgoing edges.
 * needs_attention is terminal for automation; a manual-resolution flow
 */
export const VALID_TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  [orderState.INITIALIZED]: [
    orderState.PAYMENT_AUTHORIZED,
    orderState.DECLINED,
  ],
  [orderState.PAYMENT_AUTHORIZED]: [
    orderState.COMPLETE,
    orderState.CANCELLED,
    orderState.NEEDS_ATTENTION,
  ],
  [orderState.COMPLETE]: [],
  [orderState.DECLINED]: [],
  [orderState.CANCELLED]: [],
  [orderState.NEEDS_ATTENTION]: [],
};

export function canTransition(from: OrderState, to: OrderState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Move an order to `to`, appending a timestamped history entry.
 * Returns a new order; the input is not mutated.
 *
 * @throws TransitionError if `order.state → to` is not allowed.
 */
export function transition(
  order: Order,
  to: OrderState,
  meta: Pick<StateTransition, "reason" | "error"> = {},
): Order {
  if (!canTransition(order.state, to)) {
    throw new TransitionError(order.state, to);
  }

  const entry: StateTransition = {
    from: order.state,
    to,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  // History in reverse-chronological order
  return { ...order, state: to, history: [entry, ...order.history] };
}
