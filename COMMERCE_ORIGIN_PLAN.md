# TrustCart — 3-Day Build Plan

## Goal

Build an agentic storefront for a merchant that helps a shopper discover the right bundle, obtains explicit approval before creating a payment, uses Razorpay **test mode** for checkout, and records a human-readable audit trail for every consequential action.

## Demo story

1. A buyer says: “I need a skincare gift under ₹1,500.”
2. The agent recommends a tailored bundle and explains the recommendation.
3. The buyer explicitly clicks **Approve & pay** after seeing the exact total.
4. The app creates a Razorpay test-mode order and opens Checkout.
5. The dashboard records consent, order creation, payment result, and any error.
6. If payment fails or is cancelled, the agent explains it plainly and offers a safe retry.

## Guardrails

- No order is created from chat text alone; the buyer must approve a visible amount.
- A transaction ceiling (₹1,500 by default) blocks higher totals.
- Only pre-defined catalog items can be purchased.
- Test-mode credentials stay server-side in local environment variables.
- Every important event is timestamped with the actor, reason, amount, and result.
- Failed or cancelled checkout is handled without falsely marking an order as paid.

## Scope

### Included

- Conversational product recommendation with deterministic, explainable rules
- Bundle upsell within the buyer’s budget
- Razorpay Orders API (test mode) and Checkout integration
- Transaction approval gate and spending cap
- Live audit timeline and an explicit payment failure state

### Deliberately deferred

- Real merchant inventory, fulfilment, refunds, and login
- Full UAP/ACP/AP2/x402 protocol implementations
- Production credentials and autonomous repeat purchases

## Delivery schedule

### Day 1 — Happy path

- Create the storefront UI and agent recommendation flow.
- Define catalog and product/bundle recommendation rules.
- Configure Razorpay test credentials and create a test order.

### Day 2 — Trust controls

- Add visible approval, amount cap, and structured audit events.
- Handle checkout success, cancellation, and server/API errors.
- Verify payment signatures server-side.

### Day 3 — Demo quality

- Polish mobile/desktop experience and copy.
- Add demo reset, seeded failure scenario, and audit export.
- Run end-to-end test-mode demo and record the pitch.

## Local setup

Create a `.env` file from `.env.example` and use Razorpay **test** keys only. Run `npm start`, then open `http://localhost:3000`. This starter deliberately uses no runtime npm dependencies.

## Success criteria

The demo clearly proves that the agent can grow basket value while every payment action is explainable, capped, confirmed, and auditable.
