# RecoverFlow

RecoverFlow is a revenue recovery engine built for the Razorpay AI Hackathon (AI Revenue Recovery track).

When a payment fails or an invoice goes overdue, most merchants either spam the user with generic WhatsApp messages or blindly trigger automated retries until banks charge bounce fees. 

RecoverFlow sits between payment gateway webhooks and recovery actions. It inspects failure signals, checks whether contacting the customer is legally and ethically compliant, selects the least intrusive intervention, and verifies actual money recovered through idempotent bank confirmation events.

---

## How It Works

Revenue loss in Indian payments usually happens in stages:
1. An issuer gateway times out (e.g. HDFC/SBI UPI degradation during peak hours).
2. A customer abandons checkout because shipping charges changed.
3. A recurring subscription mandate fails because an underlying card expired.
4. An invoice ages past net-30 terms.

RecoverFlow handles each stage as a bounded state machine:

```
[ Ingestion ]        Incoming failure events (UPI timeouts, dropped carts, mandate declines)
     │
     ▼
[ Diagnosis ]        Rule engine + LLM classifier extracts error codes and root causes
     │
     ▼
[ Guardrails ]       Server checks DNC list, frequency caps (max 1/batch), calling hours (9am-7pm)
     │
     ▼
[ Approval ]         Operator signs off on batch or executes individual actions
     │
     ▼
[ Execution ]        Sends fallback UPI links, schedules mandate retries, or launches voice agent
     │
     ▼
[ Confirmation ]     Listens for verified bank settlement events; updates recovery scoreboard
```

---

## Track Directions Implemented

The hackathon brief listed 7 target directions. Here is how each is implemented in code:

### 1. Payment Degradation
- **File**: `server.js` (`analyzeSignal`, seed cases `pay-1042`, injected cases)
- **Problem**: Peak-hour bank switch timeouts cause false negatives.
- **Action**: Detects `GATEWAY_TIMEOUT` errors, avoids repeating the same switch, and issues a 20-minute expiring 1-click fallback UPI payment link.

### 2. Checkout Drop-Off
- **File**: `server.js` (`cart-2017`), `public/commerce.html`
- **Problem**: Customers abandon carts at final shipping steps.
- **Action**: Automatically reserves inventory for a 2-hour grace window and dispatches a single cart restore link without discounts or aggressive countdown timers.

### 3. Failed Subscription Recovery
- **File**: `server.js` (`sub-3041`)
- **Problem**: RBI mandate recurring debits fail when underlying card tokens expire.
- **Action**: Provides a 48-hour service grace period and sends a secure card tokenization update link instead of immediately cutting off access.

### 4. B2B Receivables Chaser
- **File**: `server.js` (`inv-883`)
- **Problem**: Corporate invoices stall in approval chains.
- **Action**: Follows a net-15 dunning ladder: T+7 polite ping, T+15 formal notice with Razorpay Smart Invoice link and split-payment option, T+30 account hold alert.

### 5. Mandate Retry Sequencer
- **File**: `server.js` (`man-4019`, endpoint `/api/recovery/mandate/reschedule`)
- **Problem**: Auto-debiting on the 28th-30th often fails due to month-end balance depletion, triggering bank penalty fees.
- **Action**: Analyzes bank liquidity windows and reschedules retries to the 1st of the month at 10:15 AM (94.2% historical success window).

### 6. Hinglish Voice Recovery
- **File**: `server.js` (`voice-5021`, endpoint `/api/recovery/voice/dialogue`), `public/recovery.js`
- **Problem**: High-ticket users frequently ignore SMS and WhatsApp.
- **Action**: An interactive conversational agent using Web Speech synthesis that speaks natural Hinglish. It handles objections dynamically (e.g. "Salary 5 tarikh ko aayegi", "WhatsApp pe link bhej do", "Paisa already debit ho gaya").

### 7. Promise-to-Pay (PTP) Tracker
- **File**: `server.js` (endpoints `/api/recovery/ptp/record`, `/api/recovery/ptp`)
- **Problem**: Blasting a customer who already promised to pay tomorrow ruins customer retention.
- **Action**: Logs verbal or written commitments, pauses automated reminders until the promised date, and verifies settlement on maturity.

---

## Safety and Stopping Rules

Under RBI Fair Practice Codes and standard dunning ethics, recovery systems must have hard boundaries:

- **Do Not Contact (DNC)**: Any customer with an active opt-out flag is permanently blocked from outreach.
- **Frequency Cap**: Hard limit of 1 attempt per batch cycle, and maximum 2 touches in any rolling 72-hour window.
- **Calling Hours**: Voice agent interactions are restricted to 9:00 AM to 7:00 PM IST.
- **Dispute Freeze**: If an account has an open billing or SLA dispute ticket, recovery automation halts immediately.
- **Idempotent Confirmations**: Payments are only marked recovered upon receipt of a unique bank event ID. Duplicate events are rejected with HTTP 409 to prevent inflated metrics.
- **Audit Trail**: Every action, approval, suppression, and confirmation is written to an append-only event log exportable as JSON or CSV.

---

## Project Structure

```
.
├── server.js               # Node.js HTTP server and recovery API endpoints
├── test.js                 # 33 test assertions verifying APIs and guardrails
├── package.json            # Project config (zero external runtime dependencies)
├── .env.example            # Environment variable template
├── README.md               # Documentation
├── RECOVERY_TRACK_PLAN.md  # Engineering specs and problem breakdown
├── COMMERCE_ORIGIN_PLAN.md # Spec for the companion checkout demo
└── public/
    ├── index.html          # RecoverFlow operator dashboard
    ├── recovery.js         # Client-side state, speech synthesis, PTP handling
    ├── recovery.css        # Clean dashboard styles
    ├── commerce.html       # Storefront demo to test abandoned checkouts
    ├── app.js              # Storefront client script
    └── styles.css          # Storefront styles
```

---

## Getting Started

The project has zero runtime npm dependencies. It runs directly on Node.js 18+.

```bash
# 1. Clone repository
git clone https://github.com/Manas-Jangid/RecoverFlow.git
cd RecoverFlow

# 2. Start the server
npm start
```

Visit the dashboard in your browser:
- Main Dashboard: `http://localhost:3000`
- Origin Storefront (to test drop-offs): `http://localhost:3000/commerce.html`

### Running Tests

```bash
npm test
```

This runs 33 automated checks across all API routes, guardrail rejections, idempotency rules, and export formats.

### Using Razorpay Test Credentials (Optional)

By default, RecoverFlow runs in sandbox mode with mock payment links so you can test everything without credentials.

To create live test-mode Razorpay Payment Links:
```bash
cp .env.example .env
```
Add your Razorpay test keys:
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key
PORT=3000
```
Restart `npm start`. The dashboard will automatically switch to "RAZORPAY TEST MODE" and call `https://api.razorpay.com/v1/payment_links`.

---

## API Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns runtime configuration and test-key status |
| `GET` | `/api/recovery/cases` | Returns all active signals in the queue |
| `POST` | `/api/recovery/approve-batch` | Issues scoped operator approval token for eligible cases |
| `POST` | `/api/recovery/execute` | Executes a single bounded intervention with guardrail checks |
| `POST` | `/api/recovery/confirm-payment` | Confirms receipt idempotently using bank event ID |
| `POST` | `/api/recovery/ptp/record` | Creates a Promise-to-Pay and snoozes dunning |
| `POST` | `/api/recovery/mandate/reschedule` | Reschedules mandate retries around salary clearing |
| `POST` | `/api/recovery/voice/dialogue` | Processes customer responses in Hinglish and detects intent |
| `POST` | `/api/recovery/signals/inject` | Ingests a new custom webhook signal into the pipeline |
| `GET` | `/api/recovery/export?format=json\|csv` | Downloads the audit ledger |
