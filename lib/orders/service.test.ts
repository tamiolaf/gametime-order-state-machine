import { beforeEach, describe, expect, it } from "vitest";

import {
  authorizePayment,
  completeOrder,
  createOrder,
  getOrder,
} from "@/lib/orders/service";
import { store } from "@/lib/orders/store";
import { OrderState, TransitionError } from "@/lib/orders/types";
import { stubDeps } from "@/lib/payments/stub";

const states = (id: string) => getOrder(id).history.map((h) => h.to);

beforeEach(() => store.reset());

describe("happy path", () => {
  it("initialized → payment_authorized → complete", async () => {
    const deps = stubDeps();
    const { id } = createOrder("Knicks vs Celtics");

    await authorizePayment(id, deps);
    const order = await completeOrder(id, deps);

    expect(order.state).toBe(OrderState.COMPLETE);
    expect(states(id)).toEqual([
      OrderState.COMPLETE,
      OrderState.PAYMENT_AUTHORIZED,
      OrderState.INITIALIZED,
    ]);
    const times = order.history.map((h) => Date.parse(h.timestamp));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(deps.payments.calls.void).toBe(0);
  });
});

describe("payment declined", () => {
  it("rejects the order with no cleanup", async () => {
    const deps = stubDeps({ authorize: "fail" });
    const { id } = createOrder("Taylor Swift");

    const order = await authorizePayment(id, deps);

    expect(order.state).toBe(OrderState.DECLINED);
    expect(order.history[0]?.error).toBeTruthy();
    expect(deps.payments.calls.void).toBe(0);
    expect(deps.fulfillment.calls.complete).toBe(0);
  });
});

describe("completion fails, void succeeds", () => {
  it("voids the payment and cancels", async () => {
    const { id } = createOrder("Hamilton");
    await authorizePayment(id, stubDeps());

    const deps = stubDeps({ complete: "fail" });
    const order = await completeOrder(id, deps);

    expect(order.state).toBe(OrderState.CANCELLED);
    expect(deps.payments.calls.void).toBe(1);
    expect(states(id)).toEqual([
      OrderState.CANCELLED,
      OrderState.PAYMENT_AUTHORIZED,
      OrderState.INITIALIZED,
    ]);
  });
});

describe("completion fails, void fails", () => {
  it("moves to needs_attention and surfaces the void error", async () => {
    const { id } = createOrder("Lakers vs Warriors");
    await authorizePayment(id, stubDeps());

    const deps = stubDeps({ complete: "fail", void: "fail" });
    const order = await completeOrder(id, deps);

    expect(order.state).toBe(OrderState.NEEDS_ATTENTION);
    expect(order.state).not.toBe(OrderState.CANCELLED);
    expect(deps.payments.calls.void).toBe(1);

    const last = order.history[0];
    expect(last.to).toBe(OrderState.NEEDS_ATTENTION);
    expect(last.error).toMatch(/void/i);
  });
});

describe("invalid transitions", () => {
  it("rejects complete on an initialized order without calling fulfillment", async () => {
    const deps = stubDeps();
    const { id } = createOrder("x");

    await expect(completeOrder(id, deps)).rejects.toBeInstanceOf(
      TransitionError,
    );
    expect(deps.fulfillment.calls.complete).toBe(0);
    expect(getOrder(id).state).toBe(OrderState.INITIALIZED);
  });

  it("rejects authorizing twice without charging again", async () => {
    const deps = stubDeps();
    const { id } = createOrder("x");
    await authorizePayment(id, deps);

    await expect(authorizePayment(id, deps)).rejects.toBeInstanceOf(
      TransitionError,
    );
    expect(deps.payments.calls.authorize).toBe(1);
  });

  it("rejects any action on a terminal order", async () => {
    const deps = stubDeps();
    const { id } = createOrder("x");
    await authorizePayment(id, deps);
    await completeOrder(id, deps);

    await expect(completeOrder(id, deps)).rejects.toBeInstanceOf(
      TransitionError,
    );
    await expect(authorizePayment(id, deps)).rejects.toBeInstanceOf(
      TransitionError,
    );
  });
});
