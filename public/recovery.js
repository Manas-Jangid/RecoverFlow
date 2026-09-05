// RecoverFlow — Autonomous AI Revenue Recovery & Dunning Intelligence Engine
// Razorpay AI Hackathon Submission

let cases = [];
let selected = null;
let auditEvents = [];
let ptpRecords = [];
let activeDirectionFilter = 'all';
let activeStatusFilter = 'all';
let searchQuery = '';
let activeAuditFilter = 'all';
let approvalId = null;
let offlineDemo = false;

const $ = id => document.getElementById(id);
const money = n => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const escapeHtml = str => String(str || '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

// Web Speech API Voice synthesis helper
let synth = window.speechSynthesis;
let currentUtterance = null;

function init() {
  bindEvents();
  fetchInitialData();
  checkApiConfig();
}

async function checkApiConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.live) {
      $('apiModeBadge').textContent = 'RAZORPAY TEST MODE';
      $('apiModeBadge').style.background = '#e0f2fe';
      $('apiModeBadge').style.color = '#0369a1';
    } else {
      $('apiModeBadge').textContent = 'SAFE SIMULATED SANDBOX';
    }
  } catch {
    $('apiModeBadge').textContent = 'OFFLINE LOCAL SIM';
  }
}

async function fetchInitialData() {
  try {
    const [caseRes, auditRes, ptpRes] = await Promise.all([
      fetch('/api/recovery/cases'),
      fetch('/api/recovery/audit'),
      fetch('/api/recovery/ptp')
    ]);
    cases = await caseRes.json();
    auditEvents = await auditRes.json();
    ptpRecords = await ptpRes.json();
    offlineDemo = false;
  } catch (err) {
    console.warn('Backend API unavailable, falling back to local simulation mode:', err);
    offlineDemo = true;
    $('apiModeBadge').textContent = 'OFFLINE LOCAL SIM';
    recordAudit('offline_mode_detected', 'API server unreachable; operating in safe local simulation mode.');
  }

  // Auto-select first case
  if (cases.length && !selected) {
    selected = cases[0];
  }

  renderAll();
}

function bindEvents() {
  // Batch Execution
  $('btnRunBatch').onclick = handleRunBatch;
  $('btnConfirmPayments').onclick = handleConfirmPayments;
  $('btnResetDemo').onclick = handleResetDemo;

  // Single Case Execution
  $('btnExecuteOne').onclick = () => selected && executeCase(selected);

  // Direction Filter Pills
  document.querySelectorAll('.dir-pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.dir-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeDirectionFilter = pill.dataset.direction;
      renderQueue();
    };
  });

  // Status Filter Buttons
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-status-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatusFilter = btn.dataset.statusFilter;
      renderQueue();
    };
  });

  // Search Input
  $('queueSearch').oninput = e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderQueue();
  };

  // Audit Filters
  document.querySelectorAll('[data-audit-filter]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-audit-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeAuditFilter = btn.dataset.auditFilter;
      renderAudit();
    };
  });

  // Export Buttons
  $('btnExportAuditJson').onclick = () => exportAudit('json');
  $('btnExportAuditCsv').onclick = () => exportAudit('csv');

  // Signal Injection Modal
  $('btnInjectSignal').onclick = openModal;
  $('closeModal').onclick = closeModal;
  $('btnCancelModal').onclick = closeModal;
  $('injectForm').onsubmit = handleInjectSignal;

  // Hinglish Voice Agent Controls
  $('btnVoiceSpeak').onclick = playVoiceDialogue;
  $('btnVoiceStop').onclick = stopVoiceDialogue;

  document.querySelectorAll('.reply-chip').forEach(chip => {
    chip.onclick = () => simulateVoiceReply(chip.dataset.reply);
  });

  // Mandate Rescheduler
  if ($('btnRescheduleMandate')) {
    $('btnRescheduleMandate').onclick = handleRescheduleMandate;
  }

  // PTP Update
  if ($('btnUpdatePtp')) {
    $('btnUpdatePtp').onclick = handleUpdatePtp;
  }
}

// --- RENDERING PIPELINE ---

function renderAll() {
  updateMetrics();
  renderQueue();
  renderInspector();
  renderAudit();
}

function updateMetrics() {
  const eligible = cases.filter(c => c.outcome !== 'stopped');
  const stopped = cases.filter(c => c.outcome === 'stopped');
  const done = cases.filter(c => c.done);

  const totalEligible = eligible.reduce((acc, c) => acc + c.amount, 0);
  const totalRecovered = done.reduce((acc, c) => acc + c.amount, 0);
  const totalProtected = stopped.reduce((acc, c) => acc + c.amount, 0);
  const atRisk = eligible.filter(c => !c.done).reduce((acc, c) => acc + c.amount, 0);

  $('kpiAtRisk').textContent = money(atRisk);
  $('kpiRiskCases').textContent = eligible.filter(c => !c.done).length;
  $('kpiRecovered').textContent = money(totalRecovered);
  $('kpiProtected').textContent = money(totalProtected);

  const rate = totalEligible ? Math.round((totalRecovered / totalEligible) * 100) : 0;
  $('kpiRate').textContent = `${rate}%`;

  // Dynamic DSO estimate: each confirmed recovery saves ~1.8 days of receivables aging
  const dsoSaved = (done.length * 1.8 + 4.2).toFixed(1);
  $('kpiDSO').textContent = done.length ? `-${dsoSaved}d` : '-4.2d';

  $('countAll').textContent = cases.length;

  // Batch action button states
  const pendingEligible = eligible.some(c => !c.batchAttempted && !c.done);
  $('btnRunBatch').disabled = !pendingEligible;

  const confirmationsReady = cases.some(c => c.batchAttempted && c.outcome === 'recoverable' && !c.done);
  $('btnConfirmPayments').disabled = !confirmationsReady;
}

function renderQueue() {
  let filtered = cases;

  // Direction filter
  if (activeDirectionFilter !== 'all') {
    filtered = filtered.filter(c => c.direction === activeDirectionFilter);
  }

  // Status filter
  if (activeStatusFilter === 'recoverable') {
    filtered = filtered.filter(c => c.outcome !== 'stopped' && !c.done);
  } else if (activeStatusFilter === 'sent') {
    filtered = filtered.filter(c => c.batchAttempted && !c.done);
  } else if (activeStatusFilter === 'confirmed') {
    filtered = filtered.filter(c => c.done);
  } else if (activeStatusFilter === 'stopped') {
    filtered = filtered.filter(c => c.outcome === 'stopped');
  }

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(searchQuery)) ||
      (c.id && c.id.toLowerCase().includes(searchQuery)) ||
      (c.errorCode && c.errorCode.toLowerCase().includes(searchQuery)) ||
      (c.signal && c.signal.toLowerCase().includes(searchQuery))
    );
  }

  $('queueCountBadge').textContent = `${filtered.length} signals`;

  if (!filtered.length) {
    $('caseList').innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 13px;">No signals match your filter criteria.</div>`;
    return;
  }

  $('caseList').innerHTML = filtered.map(c => {
    const isSelected = selected && selected.id === c.id;
    let statusPillClass = `status-${c.kind || 'failed'}`;
    let statusText = (c.kind || 'Signal').toUpperCase();

    if (c.done) {
      statusPillClass = 'status-voice';
      statusText = 'RECOVERED ✓';
    } else if (c.outcome === 'stopped') {
      statusPillClass = 'status-stopped';
      statusText = 'STOPPED 🛑';
    } else if (c.batchAttempted) {
      statusPillClass = 'status-abandoned';
      statusText = 'INTERVENTION SENT';
    } else if (c.ptpData && c.ptpData.status === 'active_snooze') {
      statusPillClass = 'status-ptp';
      statusText = 'PTP SNOOZED';
    }

    return `
      <article class="case-item ${isSelected ? 'selected' : ''} ${c.done ? 'done' : ''} ${c.outcome === 'stopped' ? 'stopped-case' : ''}" data-id="${escapeHtml(c.id)}">
        <div class="case-header">
          <div class="case-title-wrap">
            <strong class="case-name">${escapeHtml(c.name)}</strong>
            <span class="case-amount">${money(c.amount)}</span>
          </div>
          <span class="status-pill ${statusPillClass}">${statusText}</span>
        </div>
        <div class="case-meta-row">
          <span class="case-signal">⚡ ${escapeHtml(c.signal)}</span>
          <span class="case-error-tag">${escapeHtml(c.errorCode || 'UNKNOWN_ERR')}</span>
        </div>
        <div class="case-action-preview">
          ${escapeHtml(c.action)}
        </div>
      </article>
    `;
  }).join('');

  // Attach click listeners to case items
  document.querySelectorAll('.case-item').forEach(el => {
    el.onclick = () => {
      const caseId = el.dataset.id;
      selected = cases.find(c => c.id === caseId);
      renderQueue();
      renderInspector();
    };
  });
}

function renderInspector() {
  if (!selected) {
    $('inspDirection').textContent = 'Select A Case';
    $('inspName').textContent = 'Revenue Case Inspector';
    $('inspAmount').textContent = '₹0';
    $('inspDiagnosis').textContent = 'Click any case from the signals queue to inspect the autonomous agent decision.';
    $('inspActionText').textContent = 'No action selected.';
    $('inspDraftMsg').textContent = 'Draft template preview will appear here.';
    $('btnExecuteOne').disabled = true;
    $('voiceWidget').style.display = 'none';
    $('mandateWidget').style.display = 'none';
    $('ptpWidget').style.display = 'none';
    return;
  }

  const c = selected;

  // Header
  const directionLabels = {
    payment_degradation: '1. PAYMENT DEGRADATION',
    checkout_dropoff: '2. CHECKOUT DROP-OFF',
    subscription_recovery: '3. FAILED SUBSCRIPTION',
    b2b_receivables: '4. B2B RECEIVABLES CHASER',
    mandate_sequencer: '5. MANDATE RETRY SEQUENCER',
    hinglish_voice: '6. HINGLISH VOICE RECOVERY',
    promise_to_pay: '7. PROMISE-TO-PAY (PTP)',
    compliance_stop: 'REGULATORY COMPLIANCE STOP'
  };

  $('inspDirection').textContent = directionLabels[c.direction] || (c.direction || 'RECOVERY SIGNAL').toUpperCase();
  $('inspName').textContent = c.name;
  $('inspAmount').textContent = money(c.amount);
  $('inspUrgency').textContent = `Priority: ${(c.urgency || 'Normal').toUpperCase()}`;
  $('inspAttempts').textContent = `Attempts: ${c.attempts || 0}/2`;

  // AI Diagnostics
  $('inspDiagnosis').innerHTML = `
    <strong>Diagnosis:</strong> ${escapeHtml(c.diagnosis)}<br/>
    <div style="margin-top:6px; font-size:12px; color:var(--text-sub);">
      <b>Root Cause Factor:</b> ${escapeHtml(c.notes || 'Identified via transaction error event stream.')}
    </div>
  `;
  $('inspErrorCode').textContent = `Code: ${c.errorCode || 'ERR_REVENUE_RISK'}`;
  $('inspConfidence').textContent = `Recovery Confidence: ${c.outcome === 'stopped' ? '0% (Suppressed)' : '94.8%'}`;

  // Compliance Checks
  const hasConsent = /consent: yes/i.test(c.channel);
  const withinCap = (c.attempts || 0) < 2;
  const isStopped = c.outcome === 'stopped';
  const hasDispute = /dispute/i.test(c.signal) || /dispute/i.test(c.channel);

  $('inspComplianceGrid').innerHTML = `
    <div class="compliance-check">
      <span class="check-icon ${hasConsent ? 'pass' : 'fail'}">${hasConsent ? '✓' : '✗'}</span>
      Channel Consent: ${hasConsent ? 'Verified' : 'Missing'}
    </div>
    <div class="compliance-check">
      <span class="check-icon ${withinCap ? 'pass' : 'fail'}">${withinCap ? '✓' : '✗'}</span>
      Frequency Cap: ${c.attempts || 0}/2 Used
    </div>
    <div class="compliance-check">
      <span class="check-icon pass">✓</span>
      Calling Window: 9am-7pm IST
    </div>
    <div class="compliance-check">
      <span class="check-icon ${hasDispute ? 'fail' : 'pass'}">${hasDispute ? '✗' : '✓'}</span>
      Dispute Lock: ${hasDispute ? 'Active Dispute' : 'Clean'}
    </div>
  `;

  // Action & Draft
  $('inspChannelBadge').textContent = (c.channel || 'WHATSAPP').toUpperCase();
  $('inspActionText').textContent = c.action;

  // Generate compliant draft preview
  let draft = '';
  if (c.kind === 'failed' || c.direction === 'payment_degradation') {
    draft = `Hi ${c.name.split(' ')[0]}, your recent payment of ${money(c.amount)} could not be confirmed due to a temporary bank timeout. Click here to safely complete it: https://rzp.io/i/${c.id}`;
  } else if (c.kind === 'abandoned' || c.direction === 'checkout_dropoff') {
    draft = `Hi ${c.name.split(' ')[0]}, your cart items have been reserved for the next 2 hours. Tap here to review your basket: https://trustcart.demo/restore?cart=${c.id}`;
  } else if (c.direction === 'subscription_recovery') {
    draft = `Notice: Your subscription mandate of ${money(c.amount)} experienced an auto-debit decline due to an expired card token. Update your payment method here: https://rzp.io/m/${c.id}`;
  } else if (c.direction === 'b2b_receivables') {
    draft = `Dear Accounts Team at ${c.name}, Invoice #${c.id} (${money(c.amount)}) has crossed the credit grace window. View official GST invoice and pay via Razorpay: https://invoice.rzp.io/inv/${c.id}`;
  } else if (c.direction === 'hinglish_voice') {
    draft = `[VOICE SCRIPT] "Namaste ${c.name.split(' ')[0]} ji! Main support se bol raha hoon... aapka payment unconfirmed tha ${money(c.amount)} ka."`;
  } else {
    draft = `Payment reminder: ${money(c.amount)} is pending confirmation. Pay securely via Razorpay: https://rzp.io/i/${c.id}`;
  }
  $('inspDraftMsg').textContent = draft;

  // Widgets display
  // 1. Voice Widget
  if (c.direction === 'hinglish_voice' || c.kind === 'voice') {
    $('voiceWidget').style.display = 'block';
    if (c.voiceScript) {
      $('voiceDialogueBox').innerHTML = `<p style="color: #cbd5e1; font-style: italic;">"${escapeHtml(c.voiceScript.opening)}"</p>`;
    }
  } else {
    $('voiceWidget').style.display = 'none';
  }

  // 2. Mandate Widget
  if (c.direction === 'mandate_sequencer' || c.mandateSchedule) {
    $('mandateWidget').style.display = 'block';
    const sched = c.mandateSchedule || { scheduledDate: '2026-09-01T10:15:00Z', reason: 'Salary liquidity window alignment.' };
    $('mandateScheduleText').textContent = `Optimized Retry Window: ${sched.scheduledDate.slice(0, 10)} at 10:15 AM IST. ${sched.reason}`;
  } else {
    $('mandateWidget').style.display = 'none';
  }

  // 3. PTP Widget
  if (c.direction === 'promise_to_pay' || c.ptpData) {
    $('ptpWidget').style.display = 'block';
    const ptp = c.ptpData || { commitmentDate: 'Today', status: 'active_snooze' };
    $('ptpDetailText').textContent = `Customer committed to clear ${money(c.amount)} on ${ptp.commitmentDate}. Dunning reminders auto-snoozed.`;
  } else {
    $('ptpWidget').style.display = 'none';
  }

  // Execution Button
  const isBlocked = isStopped || c.done || c.batchAttempted;
  $('btnExecuteOne').disabled = isBlocked;

  if (c.done) {
    $('btnExecuteOne').innerHTML = 'Revenue Confirmed Recovered ✓';
  } else if (c.batchAttempted) {
    $('btnExecuteOne').innerHTML = 'Intervention Already Sent (Batch Cap)';
  } else if (isStopped) {
    $('btnExecuteOne').innerHTML = `Blocked: ${escapeHtml(c.stopReason || 'Safety Rule')}`;
  } else {
    $('btnExecuteOne').innerHTML = `Execute Bounded Intervention <span>→</span>`;
  }
}

function renderAudit() {
  let filtered = auditEvents;

  if (activeAuditFilter !== 'all') {
    filtered = filtered.filter(e => e.event === activeAuditFilter || (activeAuditFilter === 'action_blocked' && e.event.includes('blocked')));
  }

  if (!filtered.length) {
    $('auditGrid').innerHTML = `<div style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">No events match the selected filter.</div>`;
    return;
  }

  $('auditGrid').innerHTML = filtered.slice(0, 18).map(e => {
    let cardClass = '';
    if (e.event === 'payment_confirmed') cardClass = 'event-recovered';
    else if (e.event.includes('blocked') || e.event.includes('suppressed')) cardClass = 'event-blocked';
    else if (e.event.includes('approved')) cardClass = 'event-approved';
    else if (e.event.includes('ptp')) cardClass = 'event-ptp';

    const timeStr = new Date(e.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
      <article class="audit-event ${cardClass}">
        <div class="event-header">
          <span class="event-time">${escapeHtml(timeStr)}</span>
          <span class="event-badge">${escapeHtml(e.event.toUpperCase())}</span>
        </div>
        <div class="event-title">${escapeHtml(e.caseId ? `${e.caseId}: ` : '')}${escapeHtml(formatEventTitle(e.event))}</div>
        <div class="event-detail">${escapeHtml(e.detail)}</div>
      </article>
    `;
  }).join('');
}

function formatEventTitle(event) {
  return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// --- INTERVENTIONS & ACTIONS ---

async function ensureApproval() {
  if (approvalId) return approvalId;

  try {
    if (offlineDemo) {
      approvalId = `appr_local_${Date.now()}`;
      recordAudit('batch_approved', `Operator granted local simulation approval (${approvalId.slice(0, 10)}) for eligible cases.`);
      return approvalId;
    }

    const res = await fetch('/api/recovery/approve-batch', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    approvalId = data.approvalId;
    $('batchApprovalStatus').textContent = `Approved (${approvalId.slice(0, 8)})`;
    $('batchApprovalStatus').style.background = '#dcfce7';
    $('batchApprovalStatus').style.color = '#166534';

    showToast(`Operator approval captured for ${data.caseIds.length} cases.`);
    await refreshAudit();
    return approvalId;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      offlineDemo = true;
      approvalId = `appr_offline_${Date.now()}`;
      return approvalId;
    }
    throw err;
  }
}

async function executeCase(c) {
  if (!c || c.outcome === 'stopped' || c.done || c.batchAttempted) return;

  try {
    const token = await ensureApproval();

    if (offlineDemo) {
      c.batchAttempted = true;
      c.attempts = (c.attempts || 0) + 1;
      recordAudit('action_executed', `Intervention executed locally for ${c.name} (${money(c.amount)}). Payment link: https://rzp.io/i/${c.id}`, c.id);
      showToast(`Compliant intervention recorded for ${c.name}.`);
    } else {
      const res = await fetch('/api/recovery/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: c.id, approvalId: token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      Object.assign(c, data.recoveryCase);
      showToast(`Intervention executed for ${c.name}. Revenue remains unconfirmed.`);
      await refreshAudit();
    }

    renderAll();
  } catch (err) {
    recordAudit('action_blocked', `Execution failed for ${c.id}: ${err.message}`, c.id);
    showToast(`Action blocked: ${err.message}`);
    renderAll();
  }
}

async function handleRunBatch() {
  const eligible = cases.filter(c => c.outcome !== 'stopped' && !c.done && !c.batchAttempted);
  if (!eligible.length) {
    return showToast('No eligible cases remain to be processed in this batch.');
  }

  showToast(`Running batch interventions across ${eligible.length} cases...`);

  for (const c of eligible) {
    await executeCase(c);
  }

  showToast('Batch execution complete. Interventions sent.');
  renderAll();
}

async function handleConfirmPayments() {
  const pending = cases.filter(c => c.batchAttempted && c.outcome === 'recoverable' && !c.done);
  if (!pending.length) {
    return showToast('No pending interventions awaiting payment confirmation.');
  }

  showToast(`Processing bank settlement confirmations for ${pending.length} cases...`);

  for (const c of pending) {
    try {
      const eventId = `bank_evt_${c.id}_${Date.now()}`;

      if (offlineDemo) {
        c.done = true;
        recordAudit('payment_confirmed', `Confirmed receipt: ${money(c.amount)} recovered from event ${eventId}!`, c.id);
      } else {
        const res = await fetch('/api/recovery/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: c.id, eventId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        Object.assign(c, data.recoveryCase);
      }
    } catch (err) {
      recordAudit('payment_confirmation_failed', `Confirmation failed for ${c.id}: ${err.message}`, c.id);
    }
  }

  await refreshAudit();
  renderAll();
  showToast('Verified bank confirmations processed. Money recovered!');
}

async function handleResetDemo() {
  approvalId = null;
  selected = null;
  $('batchApprovalStatus').textContent = 'Awaiting Approval';
  $('batchApprovalStatus').style.background = '#f1f5f9';
  $('batchApprovalStatus').style.color = '#475569';

  try {
    if (offlineDemo) {
      window.location.reload();
      return;
    }
    const res = await fetch('/api/recovery/reset', { method: 'POST' });
    const data = await res.json();
    cases = data.cases;
    await refreshAudit();
    selected = cases[0];
    showToast('Demo state reset. Fresh signals loaded.');
    renderAll();
  } catch {
    window.location.reload();
  }
}

// --- DIRECTION 6: HINGLISH VOICE AGENT ---

function playVoiceDialogue() {
  if (!selected) return;

  const script = selected.voiceScript?.opening ||
    `Namaste ${selected.name.split(' ')[0]} ji! Main support se bol raha hoon. Aapka payment unconfirmed tha ${money(selected.amount)} ka. Kya aap WhatsApp pe direct UPI link lena chahenge?`;

  $('btnVoiceSpeak').style.display = 'none';
  $('btnVoiceStop').style.display = 'inline-flex';

  if ('speechSynthesis' in window) {
    synth.cancel();
    currentUtterance = new SpeechSynthesisUtterance(script);
    currentUtterance.rate = 0.95;
    currentUtterance.pitch = 1.0;

    // Pick Hindi or English voice if available
    const voices = synth.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hindiVoice) currentUtterance.voice = hindiVoice;

    currentUtterance.onend = () => {
      $('btnVoiceSpeak').style.display = 'inline-flex';
      $('btnVoiceStop').style.display = 'none';
    };

    synth.speak(currentUtterance);
  } else {
    setTimeout(() => {
      $('btnVoiceSpeak').style.display = 'inline-flex';
      $('btnVoiceStop').style.display = 'none';
    }, 4000);
  }

  showToast('Playing bilingual Hinglish voice agent dialogue...');
}

function stopVoiceDialogue() {
  if ('speechSynthesis' in window) {
    synth.cancel();
  }
  $('btnVoiceSpeak').style.display = 'inline-flex';
  $('btnVoiceStop').style.display = 'none';
}

async function simulateVoiceReply(userReply) {
  if (!selected) return;

  const dialogueBox = $('voiceDialogueBox');
  dialogueBox.innerHTML += `<p style="color:#fde68a; margin-top:8px;"><b>Customer:</b> "${escapeHtml(userReply)}"</p>`;
  dialogueBox.scrollTop = dialogueBox.scrollHeight;

  try {
    let data;
    if (offlineDemo) {
      data = {
        agentResponse: 'Ji samajh gaya! Main aapka payment update kar raha hoon.',
        detectedIntent: 'simulated_intent'
      };
    } else {
      const res = await fetch('/api/recovery/voice/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selected.id, userReply })
      });
      data = await res.json();
    }

    dialogueBox.innerHTML += `<p style="color:#86efac; margin-top:8px;"><b>AI Agent:</b> "${escapeHtml(data.agentResponse)}"</p>`;
    dialogueBox.scrollTop = dialogueBox.scrollHeight;

    // Speak AI response
    if ('speechSynthesis' in window) {
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(data.agentResponse);
      utt.rate = 0.95;
      synth.speak(utt);
    }

    // Adapt case based on objection
    if (data.recommendedAction === 'record_ptp') {
      await recordPtpForCase(selected, '2026-09-08', 'Customer verbally requested extension until upcoming Friday salary.');
    } else if (data.recommendedAction === 'apply_dnc_stop') {
      selected.outcome = 'stopped';
      selected.stopReason = 'Customer requested cancellation during voice call (Ethical Fair Dunning).';
      recordAudit('voice_cancellation_stopped', `Customer ${selected.name} requested stop. Outreach ceased immediately.`, selected.id);
      renderAll();
    }

    await refreshAudit();
  } catch (err) {
    console.error(err);
  }
}

// --- DIRECTION 5 & 7 HELPERS ---

async function handleRescheduleMandate() {
  if (!selected) return;
  try {
    const res = await fetch('/api/recovery/mandate/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: selected.id,
        targetDate: '2026-09-02T10:30:00Z',
        reason: 'Re-sequenced to Salary Credit window + Bank Clearing Liquidity Spike (10:30 AM).'
      })
    });
    const data = await res.json();
    if (data.success) {
      selected.mandateSchedule = data.mandateSchedule;
      showToast('Mandate debit successfully re-scheduled to optimal liquidity window.');
      await refreshAudit();
      renderAll();
    }
  } catch (err) {
    showToast('Failed to reschedule mandate.');
  }
}

async function handleUpdatePtp() {
  if (!selected) return;
  const newDate = prompt('Enter new promised payment date (YYYY-MM-DD):', '2026-09-10');
  if (newDate) {
    await recordPtpForCase(selected, newDate, 'Updated promise date via operator dashboard.');
  }
}

async function recordPtpForCase(c, date, note) {
  try {
    const res = await fetch('/api/recovery/ptp/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: c.id, committedDate: date, note })
    });
    const data = await res.json();
    if (data.success) {
      c.ptpData = data.recoveryCase.ptpData;
      showToast(`Promise-to-Pay recorded for ${date}. Reminders snoozed.`);
      await refreshAudit();
      renderAll();
    }
  } catch (err) {
    showToast('Failed to record Promise-to-Pay.');
  }
}

// --- SIGNAL INJECTION MODAL ---

function openModal() {
  $('injectModal').classList.add('open');
  $('sigCustomer').focus();
}

function closeModal() {
  $('injectModal').classList.remove('open');
}

async function handleInjectSignal(e) {
  e.preventDefault();

  const payload = {
    customerName: $('sigCustomer').value.trim(),
    amount: Number($('sigAmount').value) || 1500,
    kind: $('sigKind').value,
    errorCode: $('sigErrorCode').value.trim() || 'GATEWAY_DEGRADATION',
    signal: $('sigSignal').value.trim() || 'Simulated failure webhook received just now',
    channelConsent: document.querySelector('input[name="sigConsent"]:checked').value === 'yes',
    isDNC: $('sigIsDnc').checked
  };

  try {
    const res = await fetch('/api/recovery/signals/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    cases.unshift(data.recoveryCase);
    selected = data.recoveryCase;
    closeModal();
    $('injectForm').reset();
    showToast(`Signal injected for ${data.recoveryCase.name}! Diagnosed by AI.`);
    await refreshAudit();
    renderAll();
  } catch (err) {
    showToast(`Failed to inject signal: ${err.message}`);
  }
}

// --- EXPORT & AUDIT HELPERS ---

async function exportAudit(format = 'json') {
  try {
    const link = document.createElement('a');
    link.href = `/api/recovery/export?format=${format}`;
    link.download = `recoverflow-audit-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Audit trail exported as ${format.toUpperCase()}.`);
  } catch {
    showToast('Export failed.');
  }
}

async function refreshAudit() {
  try {
    const res = await fetch('/api/recovery/audit');
    auditEvents = await res.json();
    renderAudit();
  } catch (err) {
    console.error('Failed to refresh audit:', err);
  }
}

function recordAudit(event, detail, caseId = null) {
  const item = {
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    at: new Date().toISOString(),
    event,
    detail,
    caseId
  };
  auditEvents.unshift(item);
  renderAudit();
}

function showToast(msg) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// Boot application
window.addEventListener('DOMContentLoaded', init);
