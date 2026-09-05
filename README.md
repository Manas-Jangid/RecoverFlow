# 🛡️ RecoverFlow — Autonomous AI Revenue Recovery & Dunning Intelligence Engine

> **Razorpay AI Hackathon Submission** — Track: **AI Revenue Recovery**  
> *"Find revenue that’s slipping away and win it back."*

---

## 🌟 Executive Summary

Revenue loss rarely happens in one clean step: a payment gateway degrades, a checkout gets abandoned, a recurring subscription fails, or a B2B invoice goes overdue. Traditional dunning systems either blast customers with spammy reminders or blindly retry cards until bank rejection penalties mount.

**RecoverFlow** is an autonomous, explainable AI Revenue Recovery platform that closes the loop from **detecting revenue at risk** and **diagnosing root causes** to **prescribing bounded interventions**, executing compliant multi-channel recovery, and **proving measured money recovered** across batches.

```
Incoming Signals               Autonomous AI Engine               Bounded Intervention Gate              Confirmed Recovery
[ UPI Failure / Drop-off ] ──> [ Root-Cause Classifier ] ──> [ Regulatory Guardrails & Approval ] ──> [ Bank Settlement Receipt ]
[ Subscription Mandates  ]     [ Sentiment & Intent    ]     [ DNC / Frequency / Window Checks   ]     [ Measured Money Won Back ]
[ Overdue B2B Receivables]     [ Salary Liquidity Model]     [ Multi-Channel (Voice/App/WhatsApp)]     [ Tamper-Evident Ledger   ]
```

---

## 🎯 Coverage of the 7 Hackathon Track Directions

RecoverFlow explicitly implements **all 7 challenge directions** described in the track brief:

| # | Direction | Problem Solved | RecoverFlow Implementation |
|---|---|---|---|
| **1** | **Payment degradation → root cause → recovery action** | Bank gateway spikes & 3DS dropouts cause false payment failures. | Diagnoses issuer-level degradation (e.g. `GATEWAY_TIMEOUT_HDFC_UPI`), switches routing node, and dispatches an instant 1-click expiring UPI payment link. |
| **2** | **Checkout drop-off recovery** | Shoppers abandon cart at final address or payment step. | Detects abandoned stages, locks inventory reservation for a grace period, and delivers a dynamic, non-coercive reminder with 1-click cart restoration. |
| **3** | **Failed-subscription recovery** | Recurring RBI mandates fail when underlying cards expire. | Identifies expired card tokens, activates a 48-hour service grace period, and delivers an in-app & WhatsApp tokenization re-auth link. |
| **4** | **B2B receivables chaser** | Invoices age past credit terms; manual chasing is inefficient. | Executes tiered dunning: T+7 gentle ping → T+15 formal notice with Razorpay Smart Invoice link & split-payment option → T+30 account hold warning. |
| **5** | **Mandate retry sequencer** | Retrying recurring auto-debits at month-end triggers bounce fees. | Analyzes historical bank clearing liquidity windows and schedules retries on customer salary credit dates (1st/2nd of month at 10:15 AM, 94% success window). |
| **6** | **Hinglish voice recovery** | Unopened digital messages leave high-LTV accounts unrecovered. | **Interactive Hinglish Voice Agent** with audio synthesis (Web Speech API) and objection handling (*"Salary 5 ko aayegi"*, *"WhatsApp pe link bhejo"*, *"Paisa kat gaya"*). |
| **7** | **Promise-to-Pay (PTP) tracker** | Customer promises to pay later; aggressive dunning breaks trust. | Captures verbal/digital payment commitments, automatically **snoozes dunning reminders** during the promise window, and verifies settlement on the due date. |

---

## ⚖️ "The Bar" — Measured Money Recovered & Strict Stopping Rules

The hackathon bar states: *"Don’t just identify the problem. Show measured money recovered across a batch, with compliant escalation, stopping rules, and an audit trail."*

### 1. Measured Batch Scoreboard
- **Revenue at Risk (₹)**: Real-time sum of eligible, unrecovered pipeline value.
- **Confirmed Recovered (₹)**: Increments **only upon verified, idempotent bank payment receipts** (`/api/recovery/confirm-payment`). A promise is never booked as revenue.
- **Protected by Guardrails (₹)**: Quantifies the balance safeguarded against illegal or harassing outreach.
- **Net Recovery Rate (%)**: Confirmed Recovered / Total Eligible Batch Value.
- **DSO Reduction (Days)**: Estimated reduction in Days Sales Outstanding (-8.4 days average).

### 2. Regulatory Stopping Rules & Compliance Engine
Every intervention must pass a 5-point server-enforced compliance check:
1. **Channel Consent Verification**: Explicit opt-in (`WhatsApp consent: yes`, `Email consent: yes`, `Voice consent: yes`).
2. **Frequency Cap Enforcement**: Maximum 1 attempt per batch cycle, max 2 touches per rolling 72-hour window.
3. **Do-Not-Contact (DNC) Hard Stop**: Customers on DNC lists are permanently suppressed.
4. **Dispute & Chargeback Lock**: If a commercial or SLA dispute ticket is active, automated dunning is frozen immediately.
5. **RBI Fair Recovery Calling Windows**: Voice calls are restricted to 9:00 AM – 7:00 PM IST.

### 3. Scoped Operator Approval Gate
Interventions cannot execute autonomously without a human-in-the-loop batch token (`/api/recovery/approve-batch`). Operators retain single-case override capabilities.

### 4. Cryptographic-Style Tamper-Evident Ledger
Every assessment, approval, stopped outreach, dialogue turn, and confirmed payment is logged with microsecond timestamps and unique IDs. Available for export in **JSON** and **CSV**.

---

## 🚀 Quick Start (Zero External Dependencies)

RecoverFlow uses pure Node.js standard libraries (`http`, `crypto`, `fs`, `path`, `https`) and Vanilla JS/CSS. **No `npm install` required!**

### 1. Clone & Run
```bash
# Start the server
npm start
```

Open your browser to:
- **Dashboard**: `http://localhost:3000`
- **Companion Checkout Storefront**: `http://localhost:3000/commerce.html`

### 2. Run Automated Test Suite
```bash
npm test
```
*33/33 automated assertions test all 7 track directions, compliance stopping rules, approval gates, PTP recording, mandate rescheduling, and idempotency.*

### 3. Optional: Live Razorpay Test Keys
To enable live test-mode Razorpay Payment Links (`/v1/payment_links`):
```env
# .env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
PORT=3000
```
*(If no keys are provided, RecoverFlow automatically operates in safe simulated sandbox mode without crashing).*

---

## 🎬 Live Demo Walkthrough Script (2-Minute Pitch)

1. **The Executive Dashboard (`http://localhost:3000`)**:
   - Point out the 5 KPI cards tracking Revenue at Risk (₹45,398), Confirmed Recovered (₹899), and Value Protected by Guardrails (₹46,648).
   - Point to the 7 Direction Ribbon Pills displaying full coverage of the challenge.

2. **Hinglish Voice Recovery with Objection Handling**:
   - Click the **🎙️ 6. Hinglish Voice Recovery** filter pill.
   - Select **Priya Sharma** (Course EMI Missed).
   - In the Decision Studio, click **🔊 Play Voice Dialogue (Hinglish)** to hear the agent speak bilingual Hinglish.
   - Click the customer objection chip: *"Salary 5 ko aayegi"*.
   - Watch the AI agent adapt empathetically and automatically record a **Promise-to-Pay (PTP)** with automated dunning snooze!

3. **Smart Mandate Retry Sequencer**:
   - Click **📅 5. Mandate Sequencer** and select **Rohan Malhotra**.
   - Show how the agent identifies a month-end liquidity squeeze and reschedules debit to the 1st of the month at 10:15 AM (94.2% liquidity confidence).

4. **Simulate a Live Webhook Ingestion**:
   - Click **➕ Inject Signal Webhook**.
   - Enter a simulated customer (e.g. *Kavita Chawla, ₹3,200, Failed UPI*).
   - Watch the agent immediately classify the error, run compliance checks, and insert it at the top of the queue.

5. **Batch Execution & Measured Recovery**:
   - Click **⚡ Run Approved Batch**. Notice operator approval is captured and bounded interventions are dispatched.
   - Click **💳 Process Payment Confirmations**. Watch the Confirmed Recovered counter rise and the Recovery Rate update on the scoreboard.

6. **Compliance Audit Trail**:
   - Scroll down to the **Auditable Recovery Ledger** to show the timestamped record of every decision, including suppressed cases (DNC, frequency caps).
   - Click **Export JSON** or **Export CSV** to demonstrate audit compliance.

---

## 📁 Repository Structure

```
├── server.js               # Zero-dependency Node.js HTTP server & AI Revenue Recovery APIs
├── test.js                 # 33-point automated test suite covering all directions & guardrails
├── package.json            # Project metadata & npm start / npm test scripts
├── .env.example            # Razorpay test credentials template
├── README.md               # Complete architecture, track mapping, and demo pitch guide
├── RECOVERY_TRACK_PLAN.md  # 3-Day build plan & engineering specs
└── public/
    ├── index.html          # Flagship RecoverFlow Command Center UI
    ├── recovery.html       # Mirrored route for evaluator convenience
    ├── recovery.js         # Reactive frontend controller (Audio, PTP, Batch, Ledger)
    ├── recovery.css        # Razorpay-inspired executive fintech design system
    ├── commerce.html       # Companion checkout storefront (shows origin of drop-offs)
    ├── app.js              # Storefront cart logic
    ├── styles.css          # Storefront styles
    └── favicon.svg         # RecoverFlow logo icon
```

---

## 🏆 Evaluation Matrix Checklist

- [x] **Detects revenue at risk across multiple channels** (UPI degradation, checkout drop-off, subscriptions, B2B).
- [x] **Autonomous & explainable root-cause diagnosis** (gateway timeouts, card token expiry, liquidity timing).
- [x] **Bounded intervention workflow** (one touch per batch cycle, pre-approved neutral templates).
- [x] **Regulatory compliance & stopping rules** (RBI calling hours, DNC, frequency caps, dispute locks).
- [x] **Hinglish voice recovery agent** with interactive audio dialogue and objection handling.
- [x] **Promise-to-Pay (PTP) tracker** with commitment recording and automated snooze.
- [x] **Mandate retry sequencer** aligned with bank salary clearing cycles.
- [x] **Measured money recovered across a batch** with strict idempotency (confirmed bank events only).
- [x] **Tamper-evident audit trail** with JSON/CSV export.
- [x] **Zero friction setup** (`npm start` works immediately with no dependencies).
