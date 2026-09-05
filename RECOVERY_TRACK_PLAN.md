# RecoverFlow — AI Revenue Recovery Platform Specifications

## Goal

Build an autonomous, explainable AI Revenue Recovery platform tailored for the **Razorpay AI Hackathon** that identifies at-risk revenue across multiple merchant touchpoints, diagnoses root causes, executes bounded compliant recovery interventions, and reports measured money recovered across a batch with stopping rules and an audit trail.

---

## 7 Challenge Directions Implemented

1. **Payment Degradation → Root Cause → Recovery Action**:
   - Technical diagnosis of gateway degradation (HDFC/SBI UPI nodes, 3DS authentication drops).
   - Prescribes gateway route switching and dispatches fresh 1-click expiring payment links.

2. **Checkout Drop-Off Recovery**:
   - High-intent cart drop-off detection at shipping address step.
   - Dynamic inventory reservation grace period (2 hours) and non-coercive restore link.

3. **Failed-Subscription Recovery**:
   - RBI recurring auto-debit decline handling (card token expiry, e-NACH errors).
   - In-app notice + WhatsApp card token renewal link with 48h active service grace period.

4. **B2B Receivables Chaser**:
   - Tiered dunning engine: T+7 polite reminder → T+15 formal notice with Razorpay Smart Invoice link & split-pay option → T+30 account hold warning.

5. **Mandate Retry Sequencer**:
   - Evaluates customer salary credit cycles (1st/2nd of month) to schedule retries at peak liquidity clearing windows (10:15 AM, 94.2% confidence), avoiding bank rejection fees.

6. **Hinglish Voice Recovery**:
   - Interactive conversational voice agent with Web Speech API audio synthesis and natural bilingual Hinglish dialogue.
   - Handles customer objections (*"Salary 5 ko aayegi"*, *"WhatsApp pe link bhej do"*, *"Paisa pehle hi kat gaya"*, *"Cancel kar do"*).

7. **Promise-to-Pay (PTP) Tracker**:
   - Records customer commitment dates and amounts.
   - Automatically snoozes aggressive dunning during the commitment window.
   - Idempotently confirms fulfillment on bank settlement receipts.

---

## ⚖️ Regulatory Guardrails & Stopping Rules

- **Channel Consent**: Explicit verification required (`WhatsApp consent: yes`, `Email consent: yes`, `Voice consent: yes`).
- **Frequency Cap**: Maximum 1 attempt per batch cycle, max 2 touches per rolling 72-hour window.
- **Do-Not-Contact (DNC)**: Hard suppression of customers on DNC lists per RBI Fair Practice Code.
- **Dispute Lock**: Cases with active commercial/SLA disputes or chargebacks are frozen immediately from automated outreach.
- **Calling Hours**: Voice calls restricted to 9:00 AM – 7:00 PM IST.
- **Neutral Language**: Pre-approved, non-threatening, transparent communication only.

---

## 📊 Measured Batch Scoreboard

- **Revenue at Risk (₹)**: Current sum of unrecovered, eligible cases.
- **Confirmed Recovered (₹)**: Strictly confirmed from unique bank payment receipts.
- **Protected by Guardrails (₹)**: Value saved from harassing or illegal outreach.
- **Net Recovery Rate (%)**: Confirmed / Total Eligible Batch Value.
- **DSO Reduction (Days)**: Measured improvement in Days Sales Outstanding.
- **Tamper-Evident Ledger**: Full chronological audit trail exportable in JSON and CSV.
