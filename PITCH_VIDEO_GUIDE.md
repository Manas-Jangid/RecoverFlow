# RecoverFlow — 5-Minute Demo Video Pitch Script

This script is structured specifically for the submission prompt:
> *"5-min pitch video, unlisted is fine. What broke, and how you got out."*

You can record your screen while clicking through the dashboard or use the recorded browser video artifact. Keep your tone direct, pragmatic, and engineering-focused.

---

## Time Breakdown

| Timestamp | Section | Key Talking Point |
|---|---|---|
| **0:00 - 0:45** | **The Hook** | Why revenue loss in India is non-linear and why dumb dunning fails |
| **0:45 - 2:30** | **Live Product Demo** | Scoreboard, 7 directions, Hinglish voice agent, batch recovery |
| **2:30 - 4:00** | **What Broke & How We Got Out** | 3 real engineering hurdles and how we solved them |
| **4:00 - 5:00** | **Architecture & Wrap Up** | 33 automated tests, zero-dependency engine, measured ROI |

---

## Minute-by-Minute Script

### [0:00 - 0:45] Section 1: The Hook and Problem

**Screen**: Open `http://localhost:3000`. Full view of the executive dashboard.

> *"Hi everyone, this is Manas. I'm presenting **RecoverFlow**, built for the Razorpay AI Hackathon in the AI Revenue Recovery track.*
>
> *In Indian payments, revenue loss rarely happens in a single clean step. A bank switch like HDFC or SBI degrades during peak UPI hours; a shopper drops off at the shipping address step; or a recurring subscription mandate fails because an underlying debit card expired.*
>
> *Traditional dunning systems usually do one of two things: they either spam the customer with aggressive WhatsApp messages until they opt out, or they blindly retry auto-debits until the customer gets hit with bank bounce fees.*
>
> *We built RecoverFlow as a bounded, compliant recovery engine that sits between payment webhooks and recovery channels. It diagnoses the root cause, checks compliance guardrails, and proves measured money recovered based strictly on verified bank settlement receipts."*

---

### [0:45 - 2:30] Section 2: Product Demo Across the 7 Directions

**Screen**: Click through the 7 direction pills and demonstrate key features.

> *"Let me walk you through the platform.*
>
> *At the top is our **Executive Scoreboard**. We track Revenue at Risk, Confirmed Recovered, and crucially, **Protected by Guardrails**—which quantifies money deliberately suppressed from outreach to prevent harassment or compliance violations.*
>
> *We address all 7 challenge directions:*
>
> 1. *First, **Payment Degradation**: When an issuer switch times out (`GATEWAY_TIMEOUT_HDFC_UPI`), instead of retrying the broken route, the engine switches gateway nodes and generates a 20-minute expiring 1-click fallback UPI link.*
> 2. *Second, **Checkout Drop-Offs**: When a shopper abandons at the shipping address stage, we reserve inventory for a 2-hour grace period and deliver a neutral cart restore link.*
> 3. *Third, **Failed Subscriptions**: When an RBI recurring mandate declines due to an expired card token, we activate a 48-hour service grace period and send a card re-tokenization link.*
> 4. *Fourth, **B2B Receivables**: We implement a tiered dunning ladder for corporate invoices with Razorpay Smart Invoice links and split-payment options.*
> 5. *Fifth, **Mandate Retry Sequencer** [Click '5. Mandate Sequencer' pill, select Rohan Malhotra]: Month-end balance depletion causes massive mandate failure rates. Our sequencer analyzes bank clearing liquidity cycles and reschedules the debit to the 1st of the month at 10:15 AM, raising success confidence from ~40% to 94.2%. [Click 'Re-sequence Retry Window']*
> 6. *Sixth, **Hinglish Voice Recovery** [Click '6. Hinglish Voice Recovery' pill, select Priya Sharma]: High-ticket accounts often ignore texts. We built an interactive bilingual Hinglish voice agent. [Click 'Play Voice Dialogue', then click '"Salary 5 ko aayegi"']*
> 7. *Seventh, **Promise to Pay** [Click '7. Promise to Pay' pill, select Amit Patel]: When Priya or Amit says their salary hits on Friday, the agent empathetically understands the intent and automatically records a Promise to Pay, snoozing aggressive reminders.*
>
> *Now watch the batch execution: I click **Run Approved Batch**. An operator approval token is issued, and bounded interventions are dispatched. Once verified settlement events arrive, I click **Process Confirmations**—and our scoreboard immediately updates Confirmed Recovered revenue to over ₹46,000 with zero unconfirmed fluff."*

---

### [2:30 - 4:00] Section 3: What Broke, and How We Got Out

**Screen**: Scroll to the **Auditable Recovery Ledger** and open the **RBI Fair Practice Code** footer modal.

> *"Now for the most important part of any real build: **What broke, and how we got out**.*
>
> *During development, we hit three critical failure points:*
>
> #### War Story 1: The 'Financial Hallucination' Trap
> *What broke:* In our first iteration, when a customer verbally promised to pay in the voice agent dialogue, our logic prematurely marked the case as recovered. Furthermore, if a network retry fired duplicate webhooks, the recovered amount double-counted. In finance, this is catastrophic.
> *How we got out:* We instituted a strict architectural rule: **a promise to pay is never revenue**. Revenue only increments when a unique, cryptographically verified bank settlement event ID arrives. We built server-side idempotency (`processedPaymentEvents` set) that returns HTTP 409 on duplicate events, guaranteeing financial integrity.
>
> #### War Story 2: The Month-End Mandate Rejection Cascade
> *What broke:* When testing recurring subscription retries, our automated retries repeatedly hit accounts on the 28th and 29th of the month. In India, recurring mandate declines don't just fail quietly; banks levy bounce fees on both the consumer and the merchant, destroying customer goodwill.
> *How we got out:* We killed blind retries and engineered the **Mandate Retry Sequencer**. By mapping customer payment history against typical salary credit cycles (1st–3rd of the month) and NPCI peak settlement liquidity windows (10:00 AM–1:00 PM), the engine dynamically calculates the optimal clearing time window.
>
> #### War Story 3: The 'Vibecoded' Toy vs. Regulatory Reality
> *What broke:* Our initial UI was covered in AI tropes—glowing purple gradients, pulsing orbs, and emoji clutter. Worse, it lacked compliance guardrails, meaning the bot could call users at 11 PM or spam someone who explicitly opted out.
> *How we got out:* We tore out the vibecoded fluff and rebuilt a clean, 1px fintech dashboard inspired by Razorpay's production console. More importantly, we built a **5-point server-side compliance engine**: hard DNC suppression, max 2 touches per 72-hour rolling window, an automated calling window lock between 9:00 AM and 7:00 PM IST per RBI Fair Practices, and an immediate freeze if an active dispute ticket is flagged."*

---

### [4:00 - 5:00] Section 4: Architecture, Tests & Conclusion

**Screen**: Briefly show terminal running `npm test` (33/33 tests passing) and return to the dashboard.

> *"Under the hood, RecoverFlow was built with zero external runtime dependencies—pure Node.js standard libraries. Anyone on the evaluation team can clone the repo and run `npm start` instantly with zero install friction or version conflicts.
>
> We wrote a comprehensive 33-point automated test suite in `test.js` verifying every API route, idempotency check, and regulatory stopping rule.
>
> RecoverFlow doesn't just identify revenue leaks; it closes the loop safely, ethically, and with mathematically verified money won back.
>
> Thank you for reviewing RecoverFlow. The repository and documentation are live on GitHub."*

---

## Tips for Recording

1. **Screen Resolution**: Set your monitor or browser window to 1080p (1920x1080) for crisp text readability.
2. **Audio**: Use a standard USB mic or headset to keep voiceover clear and background noise minimal.
3. **Pacing**: Speak at a steady, conversational pace; let each click register on screen for 1-2 seconds before speaking about the next feature.
4. **Recording Tools**: Loom, OBS Studio, or QuickTime. Upload to YouTube as **Unlisted** and paste the link into the Google Form.
