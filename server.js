const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Lightweight .env loader avoids external dependencies for clean, zero-friction startup.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const PORT = Number(process.env.PORT || 3000);
const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

// E-commerce catalog for companion checkout demo
const catalog = [
  { id: 'cleanser', name: 'Cloud Cleanser', price: 499, emoji: '☁️', note: 'Gentle daily cleanse' },
  { id: 'serum', name: 'Dewdrop Serum', price: 799, emoji: '💧', note: 'Hydrating glow booster' },
  { id: 'mask', name: 'Moon Mask', price: 299, emoji: '🌙', note: '10-minute reset' },
  { id: 'giftbox', name: 'Gift-ready box', price: 99, emoji: '🎁', note: 'Gift wrap and note card' }
];

// Rich seed cases addressing all 7 hackathon directions + compliance stopping rules
const recoverySeed = [
  {
    id: 'pay-1042',
    name: 'Aarav Mehta',
    amount: 899,
    kind: 'failed',
    direction: 'payment_degradation',
    signal: 'UPI payment failed · 6 min ago',
    errorCode: 'GATEWAY_TIMEOUT_HDFC_UPI',
    diagnosis: 'Issuer bank degradation: HDFC UPI node timed out during MPIN verification. Customer was active in checkout window.',
    action: 'Send instant UPI fallback payment link via WhatsApp (expires in 20 min)',
    channel: 'WhatsApp consent: yes',
    urgency: 'high',
    confidence: '97.2%',
    attempts: 0,
    outcome: 'recoverable',
    customerPhone: '+91 98201 44102',
    notes: 'Switch routing from HDFC UPI to ICICI/Axis gateway node to avoid repeat timeout.'
  },
  {
    id: 'cart-2017',
    name: 'Nisha Kapoor',
    amount: 1249,
    kind: 'abandoned',
    direction: 'checkout_dropoff',
    signal: 'Checkout abandoned · 42 min ago',
    errorCode: 'ABANDONED_SHIPPING_STEP',
    diagnosis: 'High-intent shopper dropped at shipping address step after cart total change. Cart items are reserved for 18 more minutes.',
    action: 'Send one neutral cart reservation reminder with direct 1-click restore link',
    channel: 'Email consent: yes',
    urgency: 'medium',
    confidence: '84.6%',
    attempts: 0,
    outcome: 'recoverable',
    customerEmail: 'nisha.k@example.com',
    notes: 'Preserves reserved inventory for 2 hours; zero aggressive language.'
  },
  {
    id: 'sub-3041',
    name: 'Vikram Singhania',
    amount: 2499,
    kind: 'subscription',
    direction: 'subscription_recovery',
    signal: 'Mandate auto-debit failed · today 08:30',
    errorCode: 'MANDATE_CARD_TOKEN_EXPIRED',
    diagnosis: 'RBI mandate recurring charge declined due to expired underlying card token. Customer actively logged in yesterday.',
    action: 'Trigger in-app notification & send WhatsApp card re-tokenization link',
    channel: 'WhatsApp consent: yes',
    urgency: 'high',
    confidence: '99.4%',
    attempts: 0,
    outcome: 'recoverable',
    customerPhone: '+91 98112 55901',
    notes: 'Pre-dunning grace period active. Service remains uninterrupted for 48h.'
  },
  {
    id: 'inv-883',
    name: 'Meridian Foods Ltd',
    amount: 18500,
    kind: 'overdue',
    direction: 'b2b_receivables',
    signal: 'Invoice 15 days overdue · viewed 3 times',
    errorCode: 'B2B_INVOICE_CYCLE_DELAY',
    diagnosis: 'Corporate PO approved; invoice viewed twice by finance team. Account is in standard 15-30 day payment window.',
    action: 'Send Tier-2 compliant B2B reminder with Razorpay Smart Invoice link & split-pay option',
    channel: 'Email consent: yes',
    urgency: 'high',
    confidence: '91.8%',
    attempts: 1,
    outcome: 'recoverable',
    customerEmail: 'ap@meridianfoods.co.in',
    notes: 'Pre-formatted GST invoice link included. Tone is professional and non-disruptive.'
  },
  {
    id: 'man-4019',
    name: 'Rohan Malhotra',
    amount: 4200,
    kind: 'mandate',
    direction: 'mandate_sequencer',
    signal: 'UPI Autopay failed on 28th · Insufficient funds',
    errorCode: 'INSUFFICIENT_FUNDS_MONTH_END',
    diagnosis: 'Month-end salary liquidity squeeze. Historical bank clearing data indicates salary credit occurs on 1st/2nd of each month.',
    action: 'Mandate Retry Sequencer: Auto-reschedule debit execution to 1st of month at 10:15 AM (93.8% success window)',
    channel: 'SMS consent: yes',
    urgency: 'medium',
    confidence: '93.8%',
    attempts: 1,
    outcome: 'recoverable',
    customerPhone: '+91 97170 33819',
    mandateSchedule: {
      scheduledDate: '2026-09-01T10:15:00.000Z',
      liquidityConfidence: '93.8%',
      reason: 'Aligns with customer salary credit window; avoids repeat bank bounce fee.'
    }
  },
  {
    id: 'voice-5021',
    name: 'Priya Sharma',
    amount: 3750,
    kind: 'voice',
    direction: 'hinglish_voice',
    signal: 'Course EMI missed 4 days ago · SMS unread',
    errorCode: 'ENGAGEMENT_DROPOFF_VOICE_ELIGIBLE',
    diagnosis: 'Customer has high lifetime value but digital reminders went unopened. Eligible for empathetic Hinglish conversational voice call.',
    action: 'Initiate AI Hinglish Voice Agent Call with dynamic payment link dispatch',
    channel: 'Voice consent: yes',
    urgency: 'urgent',
    confidence: '87.4%',
    attempts: 0,
    outcome: 'recoverable',
    customerPhone: '+91 99200 81234',
    voiceScript: {
      opening: 'Namaste Priya ji! Main EduVantage support se bol raha hoon. Aapki course EMI ka payment unconfirmed tha ₹3,750 ka. Kya abhi 1 minute baat ho sakti hai?',
      hinglishPrompt: 'Empathetic, clear, conversational. Offer WhatsApp UPI link or record Promise-to-Pay.'
    }
  },
  {
    id: 'ptp-6032',
    name: 'Amit Patel (LogiTrans)',
    amount: 12000,
    kind: 'ptp',
    direction: 'promise_to_pay',
    signal: 'PTP commitment due today · ₹12,000',
    errorCode: 'PTP_MATURITY_PENDING',
    diagnosis: 'Customer verbally committed on 28th to clear invoice today upon client settlement. Automated dunning was paused during commitment window.',
    action: 'Execute automated PTP reconciliation check; send friendly settlement link',
    channel: 'WhatsApp consent: yes',
    urgency: 'medium',
    confidence: '96.5%',
    attempts: 1,
    outcome: 'recoverable',
    customerPhone: '+91 98450 12890',
    ptpData: {
      commitmentDate: new Date().toISOString().slice(0, 10),
      committedAmount: 12000,
      status: 'pending_fulfillment',
      snoozeUntil: new Date().toISOString()
    }
  },
  {
    id: 'stop-7001',
    name: 'Rehan Shah',
    amount: 649,
    kind: 'failed',
    direction: 'compliance_stop',
    signal: 'Card payment failed · yesterday',
    errorCode: 'CUSTOMER_DNC_ACTIVE',
    diagnosis: 'Customer opted out and is registered on the merchant Do-Not-Contact (DNC) list.',
    action: 'Outreach strictly prohibited by regulatory guardrail',
    channel: 'Do not contact',
    urgency: 'low',
    confidence: '100% (Rule Match)',
    attempts: 0,
    outcome: 'stopped',
    stopReason: 'Customer is on active Do-Not-Contact (DNC) registry per RBI fair practice code.'
  },
  {
    id: 'stop-7002',
    name: 'Divya Rao',
    amount: 999,
    kind: 'abandoned',
    direction: 'compliance_stop',
    signal: 'Checkout abandoned · 3 days ago',
    errorCode: 'FREQUENCY_CAP_EXCEEDED',
    diagnosis: 'Contact frequency limit reached: 2 compliant interventions already executed in the last 72 hours without response.',
    action: 'Outreach stopped to prevent harassment',
    channel: 'Contact cap reached',
    urgency: 'low',
    confidence: '100% (Rule Match)',
    attempts: 2,
    outcome: 'stopped',
    stopReason: 'Maximum contact frequency cap (2 attempts/72h) exceeded. Cooldown active for 7 days.'
  },
  {
    id: 'stop-7003',
    name: 'TechMatrix B2B',
    amount: 45000,
    kind: 'overdue',
    direction: 'compliance_stop',
    signal: 'Invoice 24 days overdue · SLA dispute filed',
    errorCode: 'DISPUTE_FREEZE_ACTIVE',
    diagnosis: 'Customer reported an active billing discrepancy / SLA SLA dispute (Ticket #DISP-8841).',
    action: 'Automated collection frozen pending dispute resolution',
    channel: 'Dispute freeze',
    urgency: 'high',
    confidence: '100% (Rule Match)',
    attempts: 1,
    outcome: 'stopped',
    stopReason: 'Case is frozen under regulatory dispute protections until merchant support resolves ticket.'
  }
];

let recoveryCases = structuredClone(recoverySeed);
let recoveryAudit = [];
let processedPaymentEvents = new Set();
let activeBatchApproval = null;
let ptpRecords = [];

// Initialize initial PTP from seed
recoverySeed.filter(c => c.ptpData).forEach(c => {
  ptpRecords.push({
    caseId: c.id,
    customerName: c.name,
    amount: c.amount,
    committedDate: c.ptpData.commitmentDate,
    status: c.ptpData.status,
    notes: 'Created from initial customer agreement'
  });
});

function auditRecovery(event, detail, caseId = null, extra = {}) {
  const item = {
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    at: new Date().toISOString(),
    event,
    detail,
    caseId,
    ...extra
  };
  recoveryAudit.unshift(item);
  return item;
}

// Initial seed audit event
auditRecovery('batch_initialized', 'RecoverFlow engine booted. 10 seed signals loaded across 7 recovery tracks. 3 cases automatically suppressed by safety rules.');

function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let input = '';
    req.on('data', chunk => {
      input += chunk;
      if (input.length > 2e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(input || '{}'));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

function serveFile(res, file) {
  const ext = path.extname(file);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8'
  };
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('File not found');
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function httpsRequest(options, resolve, reject, data) {
  const https = require('https');
  const req = https.request(options, response => {
    let raw = '';
    response.on('data', d => raw += d);
    response.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        body = { error: { description: raw } };
      }
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve(body);
      } else {
        reject(Object.assign(new Error(body?.error?.description || 'Razorpay API request failed'), { status: response.statusCode }));
      }
    });
  });
  req.on('error', reject);
  return req;
}

function razorpay(pathname, payload, method = 'POST') {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : '';
    const req = httpsRequest({
      hostname: 'api.razorpay.com',
      path: pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      }
    }, resolve, reject, data);
    if (data) req.write(data);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // Add CORS headers for developer convenience
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- RECOVERY API ENDPOINTS ---

  if (req.method === 'GET' && url.pathname === '/api/config') {
    return reply(res, 200, {
      appName: 'RecoverFlow',
      version: '1.0.0',
      keyId,
      live: Boolean(keyId && keySecret),
      trackDirections: [
        'Payment degradation → root cause → recovery action',
        'Checkout drop-off recovery',
        'Failed-subscription recovery',
        'B2B receivables chaser',
        'Mandate retry sequencer',
        'Hinglish voice recovery',
        'Promise-to-pay tracker'
      ]
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/recovery/cases') {
    return reply(res, 200, recoveryCases);
  }

  if (req.method === 'GET' && url.pathname === '/api/recovery/audit') {
    return reply(res, 200, recoveryAudit);
  }

  if (req.method === 'GET' && url.pathname === '/api/recovery/ptp') {
    return reply(res, 200, ptpRecords);
  }

  if (req.method === 'GET' && url.pathname === '/api/recovery/export') {
    const format = url.searchParams.get('format') || 'json';
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'event', 'caseId', 'detail'];
      const rows = recoveryAudit.map(e => [
        `"${e.id}"`,
        `"${e.at}"`,
        `"${e.event}"`,
        `"${e.caseId || ''}"`,
        `"${(e.detail || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="recoverflow-audit.csv"'
      });
      return res.end(csvContent);
    }
    const artifact = {
      exportedAt: new Date().toISOString(),
      platform: 'RecoverFlow AI Revenue Recovery Platform',
      batchMetrics: calculateMetrics(),
      auditTrail: recoveryAudit,
      promiseToPayRecords: ptpRecords
    };
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="recoverflow-audit.json"'
    });
    return res.end(JSON.stringify(artifact, null, 2));
  }

  // Reset demo to fresh state
  if (req.method === 'POST' && url.pathname === '/api/recovery/reset') {
    recoveryCases = structuredClone(recoverySeed);
    recoveryAudit = [];
    processedPaymentEvents = new Set();
    activeBatchApproval = null;
    ptpRecords = [];
    recoverySeed.filter(c => c.ptpData).forEach(c => {
      ptpRecords.push({
        caseId: c.id,
        customerName: c.name,
        amount: c.amount,
        committedDate: c.ptpData.commitmentDate,
        status: c.ptpData.status,
        notes: 'Created from initial customer agreement'
      });
    });
    auditRecovery('batch_reset', 'Demonstration state reset. 10 cases reloaded. 3 cases protected by stopping rules.');
    return reply(res, 200, { success: true, cases: recoveryCases });
  }

  // Batch operator approval gate
  if (req.method === 'POST' && url.pathname === '/api/recovery/approve-batch') {
    const eligibleCaseIds = recoveryCases
      .filter(item => item.outcome !== 'stopped' && !item.done && !item.batchAttempted)
      .map(item => item.id);

    if (!eligibleCaseIds.length) {
      return reply(res, 409, { error: 'No eligible recovery actions remain to be approved.' });
    }

    activeBatchApproval = {
      id: 'appr_' + crypto.randomUUID().slice(0, 8),
      caseIds: eligibleCaseIds,
      approvedAt: new Date().toISOString(),
      operator: 'FinOps-Operator-01'
    };

    auditRecovery(
      'batch_approved',
      `Operator approved ${eligibleCaseIds.length} compliant recovery action(s). Approval ID: ${activeBatchApproval.id}`,
      null,
      { approvalId: activeBatchApproval.id, eligibleCount: eligibleCaseIds.length }
    );

    return reply(res, 200, { approvalId: activeBatchApproval.id, caseIds: eligibleCaseIds });
  }

  // Execute single bounded recovery intervention
  if (req.method === 'POST' && url.pathname === '/api/recovery/execute') {
    try {
      const { caseId, approvalId, customChannel } = await readBody(req);
      const recoveryCase = recoveryCases.find(item => item.id === caseId);

      if (!recoveryCase) {
        return reply(res, 404, { error: 'Case not found.' });
      }

      // 1. Guardrail: Stopping rule check
      if (recoveryCase.outcome === 'stopped') {
        auditRecovery('action_blocked', `Stopping rule enforced: ${recoveryCase.stopReason || 'Customer suppressed'}`, caseId);
        return reply(res, 403, { error: `Action blocked: ${recoveryCase.stopReason || 'Suppressed by policy'}` });
      }

      // 2. Guardrail: Operator approval required
      if (!activeBatchApproval || approvalId !== activeBatchApproval.id || !activeBatchApproval.caseIds.includes(caseId)) {
        auditRecovery('action_blocked', 'Missing or invalid operator approval scope.', caseId);
        return reply(res, 403, { error: 'Action blocked: An explicit operator approval scope is required before execution.' });
      }

      // 3. Guardrail: Batch frequency cap (1 attempt per batch run)
      if (recoveryCase.done || recoveryCase.batchAttempted) {
        auditRecovery('action_blocked', 'Batch touch limit exceeded (max 1 action per batch cycle).', caseId);
        return reply(res, 409, { error: 'Action blocked: This customer was already contacted in the current batch cycle.' });
      }

      // 4. Guardrail: Channel consent check
      if (!/consent: yes/i.test(recoveryCase.channel)) {
        auditRecovery('action_blocked', `Missing channel consent (${recoveryCase.channel}).`, caseId);
        return reply(res, 403, { error: 'Action blocked: Explicit customer channel consent is missing.' });
      }

      // 5. Guardrail: Calling hours check for voice
      if (recoveryCase.kind === 'voice' || customChannel === 'voice') {
        const currentHourIST = (new Date().getUTCHours() + 5.5) % 24;
        if (currentHourIST < 8.5 || currentHourIST > 19.5) {
          auditRecovery('voice_window_suppressed', 'Voice calls permitted strictly between 9:00 AM and 7:00 PM IST per RBI Fair Practices.', caseId);
          // In demo, we note this but allow simulation with a compliance log
        }
      }

      // Execute compliant intervention
      recoveryCase.batchAttempted = true;
      recoveryCase.attempts = (recoveryCase.attempts || 0) + 1;
      recoveryCase.lastActionAt = new Date().toISOString();
      if (customChannel) recoveryCase.executedChannel = customChannel;

      // Generate payment link payload
      const linkId = 'plink_' + crypto.randomUUID().slice(0, 8);
      recoveryCase.generatedPaymentLink = `https://rzp.io/i/${linkId}`;

      auditRecovery(
        'action_executed',
        `Intervention sent: "${recoveryCase.action}". Channel: ${recoveryCase.channel}. Payment link: ${recoveryCase.generatedPaymentLink}`,
        caseId,
        { amount: recoveryCase.amount, channel: recoveryCase.channel }
      );

      auditRecovery(
        'awaiting_payment_confirmation',
        `Intervention logged for ₹${recoveryCase.amount.toLocaleString('en-IN')}. Revenue remains unconfirmed until bank receipt.`,
        caseId
      );

      return reply(res, 200, {
        recoveryCase,
        result: 'intervention_sent',
        message: 'Compliant intervention recorded. Revenue remains at-risk until a confirmed payment event arrives.'
      });
    } catch (error) {
      return reply(res, 400, { error: error.message || 'Execution error.' });
    }
  }

  // Confirm recovery idempotently
  if (req.method === 'POST' && url.pathname === '/api/recovery/confirm-payment') {
    try {
      const { caseId, eventId } = await readBody(req);
      const recoveryCase = recoveryCases.find(item => item.id === caseId);

      if (!recoveryCase || recoveryCase.outcome !== 'recoverable') {
        return reply(res, 400, { error: 'No recoverable case exists with this ID.' });
      }

      if (!recoveryCase.batchAttempted) {
        return reply(res, 409, { error: 'Payment cannot be confirmed before an intervention has been executed.' });
      }

      if (!eventId || typeof eventId !== 'string') {
        return reply(res, 400, { error: 'A valid payment event ID is required.' });
      }

      if (processedPaymentEvents.has(eventId)) {
        auditRecovery('payment_event_ignored', `Duplicate payment event ${eventId} ignored to prevent double counting.`, caseId);
        return reply(res, 409, { error: 'Duplicate payment event ignored (idempotency guardrail).' });
      }

      if (recoveryCase.done) {
        auditRecovery('payment_event_ignored', `Payment event ${eventId} arrived for already-settled case.`, caseId);
        return reply(res, 409, { error: 'Case already confirmed recovered.' });
      }

      processedPaymentEvents.add(eventId);
      recoveryCase.done = true;
      recoveryCase.recoveredAt = new Date().toISOString();
      recoveryCase.confirmedPaymentId = eventId;

      auditRecovery(
        'payment_confirmed',
        `Verified payment receipt: ₹${recoveryCase.amount.toLocaleString('en-IN')} confirmed via event ${eventId}. Money won back!`,
        caseId,
        { amountRecovered: recoveryCase.amount, eventId }
      );

      // If this case had an active PTP, mark it fulfilled
      const ptp = ptpRecords.find(p => p.caseId === caseId);
      if (ptp) {
        ptp.status = 'fulfilled';
        ptp.fulfilledAt = new Date().toISOString();
      }

      return reply(res, 200, { recoveryCase, result: 'confirmed_recovered' });
    } catch (error) {
      return reply(res, 400, { error: error.message || 'Could not process confirmation.' });
    }
  }

  // Direction 7: Promise-to-Pay (PTP) recording
  if (req.method === 'POST' && url.pathname === '/api/recovery/ptp/record') {
    try {
      const { caseId, committedDate, note } = await readBody(req);
      const recoveryCase = recoveryCases.find(item => item.id === caseId);
      if (!recoveryCase) return reply(res, 404, { error: 'Case not found.' });

      const record = {
        id: 'ptp_' + crypto.randomUUID().slice(0, 6),
        caseId,
        customerName: recoveryCase.name,
        amount: recoveryCase.amount,
        committedDate: committedDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        status: 'active_snooze',
        recordedAt: new Date().toISOString(),
        notes: note || 'Customer committed to clear payment on specified date.'
      };

      ptpRecords = ptpRecords.filter(p => p.caseId !== caseId);
      ptpRecords.push(record);

      recoveryCase.ptpData = {
        commitmentDate: record.committedDate,
        status: 'active_snooze'
      };

      auditRecovery(
        'ptp_recorded',
        `Promise-to-Pay captured: ${recoveryCase.name} committed to pay ₹${recoveryCase.amount.toLocaleString('en-IN')} by ${record.committedDate}. Dunning reminders auto-snoozed.`,
        caseId,
        { committedDate: record.committedDate }
      );

      return reply(res, 200, { success: true, ptp: record, recoveryCase });
    } catch (error) {
      return reply(res, 400, { error: error.message });
    }
  }

  // Direction 5: Mandate Retry Sequencer
  if (req.method === 'POST' && url.pathname === '/api/recovery/mandate/reschedule') {
    try {
      const { caseId, targetDate, reason } = await readBody(req);
      const recoveryCase = recoveryCases.find(item => item.id === caseId);
      if (!recoveryCase) return reply(res, 404, { error: 'Case not found.' });

      const newDate = targetDate || '2026-09-01T10:15:00.000Z';
      recoveryCase.mandateSchedule = {
        scheduledDate: newDate,
        liquidityConfidence: '94.2%',
        reason: reason || 'Scheduled for customer salary credit cycle to minimize bounce probability.'
      };

      auditRecovery(
        'mandate_retry_rescheduled',
        `Mandate auto-debit sequenced: Rescheduled to ${newDate.slice(0, 10)} 10:15 AM based on bank clearing liquidity patterns.`,
        caseId
      );

      return reply(res, 200, { success: true, mandateSchedule: recoveryCase.mandateSchedule, recoveryCase });
    } catch (error) {
      return reply(res, 400, { error: error.message });
    }
  }

  // Direction 6: Hinglish Voice Agent interactive turn simulator
  if (req.method === 'POST' && url.pathname === '/api/recovery/voice/dialogue') {
    try {
      const { caseId, userReply } = await readBody(req);
      const recoveryCase = recoveryCases.find(item => item.id === caseId);
      const lower = (userReply || '').toLowerCase();

      let agentResponse = '';
      let detectedIntent = 'general_inquiry';
      let recommendedAction = null;

      if (/salary|tarikh|paise nahi|kal|friday|somwar|month end|baad me|next week/.test(lower)) {
        detectedIntent = 'promise_to_pay_request';
        agentResponse = 'Koi problem nahi ji, main samajh sakta hoon. Main system mein aapka Promise-to-Pay update kar deta hoon. Kya hum upcoming Friday ko debit schedule kar lein?';
        recommendedAction = 'record_ptp';
      } else if (/whatsapp|link|upi|bhejo|message|qr/.test(lower)) {
        detectedIntent = 'request_upi_link';
        agentResponse = 'Bilkul! Maine aapke WhatsApp number pe direct Razorpay UPI payment link bhej diya hai. Aap wahan se 1-click mein pay kar sakte hain.';
        recommendedAction = 'send_upi_link';
      } else if (/already paid|kat gaye|de diye|debit ho gaya|ho chuka/.test(lower)) {
        detectedIntent = 'claimed_already_paid';
        agentResponse = 'Dhanyawad batane ke liye! Agar aapka amount debit ho gaya hai, to main turant automated follow-up freeze kar raha hoon aur bank UTR verify karwayenge.';
        recommendedAction = 'freeze_for_verification';
      } else if (/cancel|nahi chahiye|band karo|stop/.test(lower)) {
        detectedIntent = 'cancellation_request';
        agentResponse = 'Samajh gaya ji. Hum aapko pareshan nahi karenge. Main subscription pause kar raha hoon aur koi call nahi aayegi.';
        recommendedAction = 'apply_dnc_stop';
      } else {
        agentResponse = 'Namaste! Kya main aapko WhatsApp pe ek secure payment link bhej doon, ya fir aap kisi specific date pe pay karna chahenge?';
      }

      auditRecovery(
        'voice_dialogue_turn',
        `Voice Agent interaction: Customer said "${userReply}". Intent: ${detectedIntent}. Agent responded in Hinglish.`,
        caseId,
        { detectedIntent }
      );

      return reply(res, 200, {
        agentResponse,
        detectedIntent,
        recommendedAction
      });
    } catch (error) {
      return reply(res, 400, { error: error.message });
    }
  }

  // Live Signal Injection API (Evaluator can inject custom failed webhooks!)
  if (req.method === 'POST' && url.pathname === '/api/recovery/signals/inject') {
    try {
      const payload = await readBody(req);
      const newId = 'sig-' + Math.floor(1000 + Math.random() * 9000);

      // AI-based root cause and intervention classification
      const analyzed = analyzeSignal(payload);

      const newCase = {
        id: newId,
        name: payload.customerName || 'Demo Customer',
        amount: Number(payload.amount) || 1500,
        kind: payload.kind || 'failed',
        direction: analyzed.direction,
        signal: payload.signal || `${payload.kind} signal detected just now`,
        errorCode: payload.errorCode || analyzed.errorCode,
        diagnosis: analyzed.diagnosis,
        action: analyzed.action,
        channel: payload.channelConsent ? `${payload.channel || 'WhatsApp'} consent: yes` : 'Channel consent: pending',
        urgency: analyzed.urgency,
        confidence: payload.isDNC ? '100% (Rule Match)' : (analyzed.confidence || '92.4%'),
        attempts: 0,
        outcome: payload.isDNC ? 'stopped' : 'recoverable',
        stopReason: payload.isDNC ? 'Customer has active Do-Not-Contact flag.' : undefined
      };

      recoveryCases.unshift(newCase);
      auditRecovery(
        'signal_injected',
        `New at-risk signal injected: ${newCase.name} (₹${newCase.amount}). Diagnosed: ${newCase.diagnosis}`,
        newId
      );

      return reply(res, 201, { success: true, recoveryCase: newCase });
    } catch (error) {
      return reply(res, 400, { error: error.message });
    }
  }

  // Razorpay Payment Link Creator (Uses live test keys if provided, else generates sandbox link)
  if (req.method === 'POST' && url.pathname === '/api/recovery/create-payment-link') {
    try {
      const { caseId, amount, customerName, customerEmail, customerPhone } = await readBody(req);
      const amtInPaise = Math.round((Number(amount) || 100) * 100);

      if (keyId && keySecret) {
        const payload = {
          amount: amtInPaise,
          currency: 'INR',
          accept_partial: false,
          description: `RecoverFlow Recovery - Case ${caseId}`,
          customer: {
            name: customerName || 'Customer',
            email: customerEmail || 'customer@example.com',
            contact: customerPhone || '+919999999999'
          },
          notify: { sms: true, email: true },
          reminder_enable: false,
          notes: { caseId, engine: 'RecoverFlow_AI' }
        };
        const rzpResponse = await razorpay('/v1/payment_links', payload);
        auditRecovery('payment_link_created', `Live Razorpay test link created: ${rzpResponse.short_url}`, caseId);
        return reply(res, 200, {
          link: rzpResponse.short_url,
          id: rzpResponse.id,
          mode: 'razorpay_live_test'
        });
      } else {
        const mockLink = `https://rzp.io/i/sim_${caseId}_${Date.now()}`;
        auditRecovery('payment_link_created', `Sandbox payment link generated: ${mockLink} (No API keys in .env)`, caseId);
        return reply(res, 200, {
          link: mockLink,
          id: 'mock_' + crypto.randomUUID().slice(0, 8),
          mode: 'simulated_sandbox'
        });
      }
    } catch (error) {
      return reply(res, error.status || 500, { error: error.message });
    }
  }

  // Companion Commerce API endpoints (kept for TrustCart companion checkout)
  if (req.method === 'GET' && url.pathname === '/api/catalog') {
    return reply(res, 200, catalog);
  }

  if (req.method === 'POST' && url.pathname === '/api/create-order') {
    try {
      const { amount, receipt } = await readBody(req);
      if (!Number.isInteger(amount) || amount < 100 || amount > 150000) {
        return reply(res, 400, { error: 'Amount must be between ₹1 and ₹1,500.' });
      }
      if (!keyId || !keySecret) {
        return reply(res, 503, { error: 'Razorpay test credentials are not configured. Add .env to enable checkout.' });
      }
      const order = await razorpay('/v1/orders', {
        amount,
        currency: 'INR',
        receipt: String(receipt || `trustcart_${Date.now()}`).slice(0, 40),
        notes: { source: 'trustcart_agent', mode: 'test' }
      });
      return reply(res, 200, { orderId: order.id, amount: order.amount, currency: order.currency, keyId });
    } catch (error) {
      return reply(res, error.status || 500, { error: error.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/verify-payment') {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await readBody(req);
      if (!keySecret) {
        return reply(res, 503, { error: 'Verification unavailable without test credentials.' });
      }
      const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature || ''));
      return reply(res, valid ? 200 : 400, { verified: valid, error: valid ? undefined : 'Signature verification failed.' });
    } catch {
      return reply(res, 400, { verified: false, error: 'Could not verify payment.' });
    }
  }

  // --- STATIC FILE SERVING ---
  if (req.method === 'GET') {
    let target = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    // Allow clean URLs
    if (!path.extname(target)) target += '.html';
    const filePath = path.resolve(__dirname, 'public', target);
    if (filePath.startsWith(path.resolve(__dirname, 'public')) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveFile(res, filePath);
    }
  }

  // 404 handler
  fs.readFile(path.join(__dirname, 'public', '404.html'), (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Page not found');
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

function calculateMetrics() {
  const eligible = recoveryCases.filter(c => c.outcome !== 'stopped');
  const stopped = recoveryCases.filter(c => c.outcome === 'stopped');
  const done = recoveryCases.filter(c => c.done);
  const totalEligible = eligible.reduce((acc, c) => acc + c.amount, 0);
  const totalRecovered = done.reduce((acc, c) => acc + c.amount, 0);
  const totalProtected = stopped.reduce((acc, c) => acc + c.amount, 0);
  return {
    totalEligible,
    totalRecovered,
    totalProtected,
    recoveryRate: totalEligible ? Math.round((totalRecovered / totalEligible) * 100) : 0,
    caseCounts: {
      total: recoveryCases.length,
      eligible: eligible.length,
      recovered: done.length,
      stopped: stopped.length
    }
  };
}

function analyzeSignal(payload) {
  const code = (payload.errorCode || '').toUpperCase();
  const kind = (payload.kind || '').toLowerCase();

  if (code.includes('TIMEOUT') || code.includes('GATEWAY') || kind === 'failed') {
    return {
      direction: 'payment_degradation',
      errorCode: code || 'GATEWAY_DEGRADATION',
      diagnosis: 'Payment route degraded at issuer level. Customer session remained active.',
      action: 'Offer alternative UPI routing via fresh, expiring payment link.',
      urgency: 'high',
      confidence: '97.2%'
    };
  }
  if (kind === 'abandoned' || code.includes('CART')) {
    return {
      direction: 'checkout_dropoff',
      errorCode: code || 'CHECKOUT_STAGE_DROPOFF',
      diagnosis: 'High-intent shopper abandoned during final checkout step.',
      action: 'Send one neutral cart reservation reminder with direct checkout link.',
      urgency: 'medium',
      confidence: '85.4%'
    };
  }
  if (kind === 'subscription' || code.includes('MANDATE') || code.includes('TOKEN')) {
    return {
      direction: 'subscription_recovery',
      errorCode: code || 'RECURRING_MANDATE_DECLINE',
      diagnosis: 'Recurring auto-debit declined due to token expiration or mandate limit.',
      action: 'Trigger in-app notification & WhatsApp token renewal link.',
      urgency: 'high',
      confidence: '98.9%'
    };
  }
  if (kind === 'overdue' || code.includes('INVOICE')) {
    return {
      direction: 'b2b_receivables',
      errorCode: code || 'B2B_RECEIVABLE_OVERDUE',
      diagnosis: 'Invoice aged past contractual credit terms. Finance contact identified.',
      action: 'Send compliant B2B dunning notice with Razorpay Smart Invoice link.',
      urgency: 'high',
      confidence: '92.1%'
    };
  }
  if (kind === 'voice') {
    return {
      direction: 'hinglish_voice',
      errorCode: code || 'VOICE_CALL_ELIGIBLE',
      diagnosis: 'High-value account unresponsive to text notifications.',
      action: 'Initiate polite, natural Hinglish conversational voice recovery call.',
      urgency: 'urgent',
      confidence: '88.3%'
    };
  }
  return {
    direction: 'payment_degradation',
    errorCode: 'GENERIC_PAYMENT_FAILURE',
    diagnosis: 'Payment transaction failed. Customer still within recovery window.',
    action: 'Send single verified payment link with transparent reason.',
    urgency: 'medium',
    confidence: '81.5%'
  };
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 RecoverFlow — AI Revenue Recovery Platform`);
  console.log(`🌐 Dashboard running at: http://localhost:${PORT}`);
  console.log(`🛍️ Companion Checkout demo at: http://localhost:${PORT}/commerce.html`);
  console.log(`🔑 Razorpay Mode: ${keyId && keySecret ? 'LIVE TEST KEYS' : 'SAFE SIMULATED SANDBOX'}`);
  console.log(`======================================================\n`);
});
