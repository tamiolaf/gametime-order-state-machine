import { describe, expect, it } from "vitest";

import {
  canTransition,
  transition,
  VALID_TRANSITIONS,
} from "@/lib/orders/stateMachine";
import { Order, OrderState, TransitionError } from "@/lib/orders/types";

const orderState = OrderState;

/** Every legal edge in the machine. Anything not listed must be rejected. */
const ALLOWED: Array<[OrderState, OrderState]> = [
  [orderState.INITIALIZED, orderState.PAYMENT_AUTHORIZED],
  [orderState.INITIALIZED, orderState.DECLINED],
  [orderState.PAYMENT_AUTHORIZED, orderState.COMPLETE],
  [orderState.PAYMENT_AUTHORIZED, orderState.CANCELLED],
  [orderState.PAYMENT_AUTHORIZED, orderState.NEEDS_ATTENTION],
];

const ALL = Object.values(orderState);
const pairs = ALL.flatMap((from) => ALL.map((to) => [from, to] as const));

describe("canTransition", () => {
  it.each(pairs)("%s → %s", (from, to) => {
    const expected = ALLOWED.some(([f, t]) => f === from && t === to);
    expect(canTransition(from, to)).toBe(expected);
  });
});

describe("transition", () => {
  const base = (): Order => ({
    id: "o1",
    name: "test",
    state: orderState.INITIALIZED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        from: null,
        to: orderState.INITIALIZED,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  it("appends a history entry and does not mutate the input", () => {
    const order = base();
    const next = transition(order, orderState.DECLINED, {
      reason: "declined",
      error: "card declined",
    });

    expect(next.state).toBe(orderState.DECLINED);
    expect(next.history.length).toBe(2);
    expect(next.history[0]).toMatchObject({
      from: orderState.INITIALIZED,
      to: orderState.DECLINED,
      reason: "declined",
      error: "card declined",
    });
    expect(typeof next.history[0].timestamp).toBe("string");
    expect(order.state).toBe(orderState.INITIALIZED);
    expect(order.history.length).toBe(1);
  });

  it("throws TransitionError on an illegal move", () => {
    expect(() => transition(base(), orderState.COMPLETE)).toThrow(
      TransitionError,
    );
  });
});
