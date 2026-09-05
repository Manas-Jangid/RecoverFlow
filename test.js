const http = require('http');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting RecoverFlow Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ ${name}`);
      failed++;
    }
  }

  try {
    // 1. Config endpoint
    const configRes = await request('/api/config');
    assert(configRes.status === 200, 'GET /api/config returns 200');
    assert(configRes.body.trackDirections?.length === 7, '7 track directions present in config');

    // 2. Cases endpoint
    const casesRes = await request('/api/recovery/cases');
    assert(casesRes.status === 200, 'GET /api/recovery/cases returns 200');
    assert(Array.isArray(casesRes.body) && casesRes.body.length >= 8, 'At least 8 seed cases loaded');

    // Verify all 7 directions are represented
    const directions = new Set(casesRes.body.map(c => c.direction));
    assert(directions.has('payment_degradation'), 'Direction 1: payment_degradation present');
    assert(directions.has('checkout_dropoff'), 'Direction 2: checkout_dropoff present');
    assert(directions.has('subscription_recovery'), 'Direction 3: subscription_recovery present');
    assert(directions.has('b2b_receivables'), 'Direction 4: b2b_receivables present');
    assert(directions.has('mandate_sequencer'), 'Direction 5: mandate_sequencer present');
    assert(directions.has('hinglish_voice'), 'Direction 6: hinglish_voice present');
    assert(directions.has('promise_to_pay'), 'Direction 7: promise_to_pay present');
    assert(directions.has('compliance_stop'), 'Guardrails: compliance_stop present');

    // 3. Reset pipeline
    const resetRes = await request('/api/recovery/reset', { method: 'POST' });
    assert(resetRes.status === 200, 'POST /api/recovery/reset returns 200');

    // 4. Batch approval gate
    const approveRes = await request('/api/recovery/approve-batch', { method: 'POST' });
    assert(approveRes.status === 200, 'POST /api/recovery/approve-batch returns 200');
    assert(approveRes.body.approvalId && approveRes.body.caseIds.length > 0, 'Approval token issued for eligible cases');
    const approvalId = approveRes.body.approvalId;

    // 5. Stopping rule guardrail: attempting to execute a stopped case must be blocked
    const stoppedExecRes = await request('/api/recovery/execute', {
      method: 'POST',
      body: { caseId: 'stop-7001', approvalId }
    });
    assert(stoppedExecRes.status === 403, 'POST /api/recovery/execute blocks stopped DNC case with 403');

    // 6. Execute compliant intervention for an eligible case
    const execRes = await request('/api/recovery/execute', {
      method: 'POST',
      body: { caseId: 'pay-1042', approvalId }
    });
    assert(execRes.status === 200, 'POST /api/recovery/execute executes compliant intervention for pay-1042');
    assert(execRes.body.result === 'intervention_sent', 'Result is intervention_sent (payment still unconfirmed)');

    // 7. Prevent repeat attempt in same batch (frequency cap guardrail)
    const repeatExecRes = await request('/api/recovery/execute', {
      method: 'POST',
      body: { caseId: 'pay-1042', approvalId }
    });
    assert(repeatExecRes.status === 409, 'Repeat intervention in same batch blocked with 409');

    // 8. Confirm payment receipt idempotently
    const confirmRes = await request('/api/recovery/confirm-payment', {
      method: 'POST',
      body: { caseId: 'pay-1042', eventId: 'evt_test_success_991' }
    });
    assert(confirmRes.status === 200, 'POST /api/recovery/confirm-payment verifies payment');
    assert(confirmRes.body.recoveryCase.done === true, 'Case marked confirmed recovered');

    // 9. Idempotency test: duplicate payment event must be rejected
    const duplicateRes = await request('/api/recovery/confirm-payment', {
      method: 'POST',
      body: { caseId: 'pay-1042', eventId: 'evt_test_success_991' }
    });
    assert(duplicateRes.status === 409, 'Duplicate payment event rejected with 409 (idempotency)');

    // 10. Promise-to-Pay (PTP) recording
    const ptpRes = await request('/api/recovery/ptp/record', {
      method: 'POST',
      body: { caseId: 'inv-883', committedDate: '2026-09-12', note: 'Client payment clearing' }
    });
    assert(ptpRes.status === 200, 'POST /api/recovery/ptp/record records commitment');
    assert(ptpRes.body.ptp.status === 'active_snooze', 'Dunning reminders auto-snoozed under PTP');

    // 11. Mandate Retry Sequencer
    const mandateRes = await request('/api/recovery/mandate/reschedule', {
      method: 'POST',
      body: { caseId: 'man-4019', targetDate: '2026-09-01T10:15:00Z', reason: 'Salary cycle liquidity alignment' }
    });
    assert(mandateRes.status === 200, 'POST /api/recovery/mandate/reschedule reschedules mandate');

    // 12. Hinglish Voice Dialogue
    const voiceRes = await request('/api/recovery/voice/dialogue', {
      method: 'POST',
      body: { caseId: 'voice-5021', userReply: 'Bhaiya salary 5 tarikh ko aayegi' }
    });
    assert(voiceRes.status === 200, 'POST /api/recovery/voice/dialogue returns 200');
    assert(voiceRes.body.detectedIntent === 'promise_to_pay_request', 'Understands customer salary objection and maps to PTP');

    // 13. Signal Injection
    const injectRes = await request('/api/recovery/signals/inject', {
      method: 'POST',
      body: {
        customerName: 'Kavita Chawla',
        amount: 3200,
        kind: 'failed',
        errorCode: 'GATEWAY_TIMEOUT_SBI_UPI',
        signal: 'UPI payment dropped at SBI switch',
        channelConsent: true
      }
    });
    assert(injectRes.status === 201, 'POST /api/recovery/signals/inject creates diagnosed signal');
    assert(injectRes.body.recoveryCase.direction === 'payment_degradation', 'Autonomous diagnosis classified as payment_degradation');

    // 14. Export JSON & CSV
    const exportJson = await request('/api/recovery/export?format=json');
    assert(exportJson.status === 200, 'GET /api/recovery/export (JSON) returns 200');
    assert(exportJson.body.auditTrail?.length > 0, 'Audit trail contains recorded events');

    const exportCsv = await request('/api/recovery/export?format=csv');
    assert(exportCsv.status === 200, 'GET /api/recovery/export (CSV) returns 200');
    assert(typeof exportCsv.body === 'string' && exportCsv.body.includes('id,timestamp,event'), 'CSV headers formatted properly');

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

// Give server 500ms to be ready if run directly
setTimeout(runTests, 500);
