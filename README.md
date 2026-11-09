# Order State Machine

A small checkout backend that models an order's lifecycle with failure recovery that depends on the stage.

```
initialized ──authorize ok──▶ payment_authorized ──complete ok──▶ complete
     │                               │
     └─ decline ──▶ declined         └─ complete fails → void payment
                                          ├─ void ok    ──▶ cancelled
                                          └─ void fails ──▶ needs_attention
```

## Running

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # vitest
```

## API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/orders` | `{ "name": string }` | 201 new order |
| GET | `/orders` | | all orders |
| GET | `/orders/:id` | | current state + history, or 404 |
| POST | `/orders/:id/authorize` | `{ "simulate"?: { "authorize": "fail" } }` | `payment_authorized` or `declined`, or 409 |
| POST | `/orders/:id/complete` | `{ "simulate"?: { "complete": "fail", "void": "fail" } }` | `complete`, `cancelled` or `needs_attention`, or 409 |

```bash
ID=$(curl -s -XPOST localhost:3000/orders -d '{"name":"Knicks vs Celtics"}' | jq -r .id)
curl -s -XPOST localhost:3000/orders/$ID/authorize
curl -s -XPOST localhost:3000/orders/$ID/complete -d '{"simulate":{"complete":"fail","void":"fail"}}'
curl -s localhost:3000/orders/$ID | jq
```

## Project layout

- `lib/orders/types.ts`: states, `Order`, history entries, domain errors
- `lib/orders/stateMachine.ts`: transition table and `transition()` (the only way state changes)
- `lib/orders/service.ts`: orchestrates payment and fulfillment calls and picks the next state
- `lib/payments/`: `PaymentGateway` / `FulfillmentService` interfaces and scriptable stubs
- `lib/orders/store.ts`: in-memory store
- `app/orders/**/route.ts`: thin HTTP layer
- `lib/http.ts`: errors → status codes (404 / 409 / 400)

## Design reasoning

<!-- TODO: fill in -->

- Why action endpoints (`/authorize`, `/complete`) instead of `PUT { state }`
- Why a result type (`{ ok, error }`) for external calls instead of exceptions
- Why the transitions are validated *before* the external call
- Why `needs_attention` instead of retrying forever or calling it cancelled

## With more time

- **Idempotency keys** on `/authorize` and `/complete`, so retried requests can't double-charge.
- **Concurrency control**: a per-order lock or optimistic `version` field so two concurrent `/complete` calls can't both run.
- **Persistence**: a real DB, with the state change and an outbox event written in one transaction.
- **Void retries** with backoff before escalating to `needs_attention`.
- **Manual resolution**: `POST /orders/:id/resolve` (`needs_attention → cancelled | complete`), plus alerting when an order enters `needs_attention`.
- **A `voiding` intermediate state**, so a crash mid-void leaves a recoverable record instead of a stale `payment_authorized`.
- **Authorization expiry**: auth holds lapse, so a sweeper could void stale `payment_authorized` orders.

<details><summary>Earlier notes</summary>

/orders

- POST request makes new order ✅
- GET request retrieves all orders ✅

/orders/:id
- GET request retrieves current order information ✅
- PUT request updates current user information

/orders/:id/history

- GET request retrieves history of order information

Should I use:
/payments/:id
/orders/:id/payments/:id

- GET request could be a list of transactions? Need to store order history somewhere


- how to track order state history with timestamps?

</details>
