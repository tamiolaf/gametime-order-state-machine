/**
 * Core domain types for the order state machine.
 *
 *   initialized ──authorize ok──▶ payment_authorized ──complete ok──▶ complete
 *        │                               │
 *        └─ decline ──▶ declined         └─ complete fails → void payment
 *                                              ├─ void ok    ──▶ cancelled
 *                                              └─ void fails ──▶ needs_attention
 *
 * Terminal states: complete, declined, cancelled.
 * needs_attention is terminal for automation — it requires a human.
 */

export const OrderState = {
  INITIALIZED: "initialized",
  PAYMENT_AUTHORIZED: "payment_authorized",
  COMPLETE: "complete",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  NEEDS_ATTENTION: "needs_attention",
} as const;

export type OrderState = (typeof OrderState)[keyof typeof OrderState];

export interface StateTransition {
  // null only for the creation entry.
  from: OrderState | null;
  to: OrderState;
  timestamp: string;
  reason?: string;
  error?: string;
}

export interface Order {
  id: string;
  name: string;
  state: OrderState;
  createdAt: string;
  updatedAt: string;
  history: StateTransition[];
}

// Maps to HTTP 409.
export class TransitionError extends Error {
  constructor(
    public readonly from: OrderState,
    public readonly to: OrderState,
  ) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

// Maps to HTTP 404.
export class OrderNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Order not found: ${id}`);
    this.name = "OrderNotFoundError";
  }
}
