import type {
  FulfillmentService,
  OrderDeps,
  PaymentGateway,
  Result,
} from "@/lib/payments/types";

export type Outcome = "ok" | "fail";

// Which calls should fail. Anything omitted succeeds
export interface SimulateOptions {
  authorize?: Outcome;
  complete?: Outcome;
  void?: Outcome;
}

const result = (outcome: Outcome | undefined, error: string): Result =>
  outcome === "fail" ? { ok: false, error } : { ok: true };

// Records calls so tests can assert e.g. "void was never called".
export class StubPaymentGateway implements PaymentGateway {
  calls = { authorize: 0, void: 0 };

  constructor(private readonly sim: SimulateOptions = {}) {}

  async authorize(): Promise<Result> {
    this.calls.authorize++;
    return result(this.sim.authorize, "card declined");
  }

  async void(): Promise<Result> {
    this.calls.void++;
    return result(this.sim.void, "void rejected by processor");
  }
}

export class StubFulfillment implements FulfillmentService {
  calls = { complete: 0 };

  constructor(private readonly sim: SimulateOptions = {}) {}

  async complete(): Promise<Result> {
    this.calls.complete++;
    return result(this.sim.complete, "ticket transfer failed");
  }
}

export function stubDeps(sim: SimulateOptions = {}) {
  const payments = new StubPaymentGateway(sim);
  const fulfillment = new StubFulfillment(sim);
  return { payments, fulfillment } satisfies OrderDeps;
}
