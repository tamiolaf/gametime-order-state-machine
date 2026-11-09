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

- In lieu of a database, I used an in-memory store for the `Orders`. Keeping in on global this allowed it to survive hot reloads. This would be swapped for a real DB in production.
- I decided to keep the history of an object's states as one of the properties, instead of some global log to track every change made in the system. It's more likely to be interested in a single item's history than the complete system for triaging.
- I decided to include createdAt and updatedAt on the Order to determine the age of the Order at a quick glance
- I chose to use action endpoints over `PUT { state }` to better communicate the downstream effects of each API call to the user and potentially enforce validations on each call
- I decided to validate transtitions before making external calls, because for real world orders you wouldn't want to do something like charge a card before confirming that that particular transaction is allowed.

## With more time

- **Idempotency keys** on `/authorize` and `/complete`, so retried requests can't double-charge.
- **Concurrency control**: a per-order lock or optimistic `version` field so two concurrent `/complete` calls can't both run.
- **Persistence**: a real DB, with the state change and an outbox event written in one transaction.
- **Void retries** with backoff before escalating to `needs_attention`.
- **Manual resolution**: `POST /orders/:id/resolve` (`needs_attention → cancelled | complete`), plus alerting when an order enters `needs_attention`.
- **Manual resolution (cont.)**: `GET /orders/state/needs_attention` (`needs_attention → cancelled | complete`), to query all orders needing human intervention at once
- **A `voiding` intermediate state**, so a crash mid-void leaves a recoverable record instead of a stale `payment_authorized`.
- **Authorization expiry**: auth holds lapse, so a sweeper could void stale `payment_authorized` orders.
- **System History Log**: global system history of all events changed in order to triage real-time errors without inspecting each item 

## AI Use
I created the API endpoints, order states, and POST/GET requests to move the order from creation to completion. I used Claude Code to find edge cases, draw diagrams, write tests, and possible security errors. This helped save time during development and discover possible omissions. All changes were throughly reviewed and adjusted to be more readable and concise. I manually tested the API endpoints with Postman to ensure orders move as expected. I also adjusted some variable names, removed duplicated code, and confirmed that all tests functioned as intended.
