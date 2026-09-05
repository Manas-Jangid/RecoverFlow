const products = {
  cleanser: { name: 'Cloud Cleanser', price: 499, emoji: '☁️', note: 'Gentle daily cleanse' },
  serum: { name: 'Dewdrop Serum', price: 799, emoji: '💧', note: 'Hydrating glow booster' },
  mask: { name: 'Moon Mask', price: 299, emoji: '🌙', note: '10-minute reset' },
  giftbox: { name: 'Gift-ready box', price: 99, emoji: '🎁', note: 'Gift wrap and note card' }
};
const MAX_AMOUNT = 1500;
let basket = [], config = {}, audit = [];
const $ = id => document.getElementById(id);
const money = value => `₹${value.toLocaleString('en-IN')}`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function addAudit(title, detail, type = 'ok') {
  audit.unshift({ title, detail, type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
  $('audit').innerHTML = audit.map(event => `<article class="event ${event.type === 'error' ? 'error' : ''}"><span class="time">${escapeHtml(event.time)} · ${event.type === 'error' ? 'FAILURE' : 'RECORDED'}</span><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.detail)}</p></article>`).join('');
}
function chat(text, who = 'agent') { const d = document.createElement('div'); d.className = `message ${who}`; d.textContent = text; $('chat').appendChild(d); $('chat').scrollTop = $('chat').scrollHeight; }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 3300); }
function total() { return basket.reduce((sum, item) => sum + products[item].price, 0); }
function renderBasket() {
  const amount = total(); $('total').textContent = money(amount);
  $('items').innerHTML = basket.map(id => { const p = products[id]; return `<div class="item"><span class="icon">${p.emoji}</span><div><strong>${p.name}</strong><small>${p.note}</small></div><b>${money(p.price)}</b></div>`; }).join('') || '<p class="empty">Lumi’s recommendation will appear here.</p>';
  $('approve').disabled = !basket.length || amount > MAX_AMOUNT;
}
function recommend(input) {
  const lower = input.toLowerCase();
  const wantsGift = /gift|present|friend|mom|mother/.test(lower);
  const normalizedInput = lower.replace(/,/g, '');
  const budgetMatch = normalizedInput.match(/(?:₹|rs\.?|under|budget)\s*(?:₹|rs\.?)?\s*(\d{1,5})/);
  const budget = budgetMatch ? Number(budgetMatch[1]) : MAX_AMOUNT;
  // Keep gift presentation ahead of optional add-ons when applying the buyer's cap.
  basket = wantsGift ? ['cleanser', 'giftbox', 'serum'] : ['cleanser', 'serum', 'mask'];
  while (total() > budget && basket.length) basket.pop();
  if (!basket.length) {
    $('basketTitle').textContent = 'No match within budget';
    $('reason').textContent = `The lowest catalog price is ${money(Math.min(...Object.values(products).map(product => product.price)))}. I will not propose an item above your ${money(budget)} limit.`;
    $('reason').classList.remove('hidden'); renderBasket();
    chat(`I can’t find a catalog item within ${money(budget)}. I won’t recommend something above your limit—would you like to adjust the budget?`);
    addAudit('Budget guardrail applied', `Buyer brief: “${input}”. No catalog item fits the declared ${money(budget)} budget.`, 'error');
    return;
  }
  const includesGiftBox = basket.includes('giftbox');
  $('basketTitle').textContent = wantsGift && includesGiftBox ? 'A thoughtful gift set' : wantsGift ? 'A thoughtful skincare pick' : 'Your glow routine';
  $('reason').textContent = `Why this basket: ${wantsGift ? includesGiftBox ? 'you mentioned a gift, so I included a ready-to-give box' : 'you mentioned a gift, so I kept the recommendation within your available budget' : 'these products layer from cleanse to hydrate'} while keeping the total at or below ${money(Math.min(budget, MAX_AMOUNT))}. The agent cannot exceed the merchant’s ₹1,500 cap.`;
  $('reason').classList.remove('hidden'); renderBasket();
  const reply = `I recommend ${basket.map(id => products[id].name).join(', ')} for ${money(total())}. ${wantsGift ? includesGiftBox ? 'The gift box adds a polished finish.' : 'I prioritised the product value within your budget.' : 'It covers cleanse, hydrate, and a weekly reset.'} Review the exact basket, then approve it only if it looks right.`;
  chat(reply); addAudit('Recommendation generated', `Buyer brief: “${input}”. Rule-based basket selected: ${money(total())}, within the configured cap.`);
}
async function checkout() {
  const amount = total();
  if (amount > MAX_AMOUNT) return toast('Blocked: this total exceeds the merchant cap.');
  addAudit('Buyer approval captured', `Buyer explicitly approved ${money(amount)} before an order was created.`);
  $('approve').disabled = true; $('approve').textContent = 'Creating secure order…';
  try {
    const response = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amount * 100, receipt: `tc_${Date.now()}` }) });
    const order = await response.json();
    if (!response.ok) throw new Error(order.error);
    addAudit('Razorpay test order created', `Order ${order.orderId}. Amount: ${money(amount)}. This action occurred only after buyer approval.`);
    const options = { key: order.keyId, amount: order.amount, currency: 'INR', name: 'TrustCart', description: 'Agent-approved basket', order_id: order.orderId, theme: { color: '#136d54' }, handler: verifyPayment, modal: { ondismiss: () => paymentFailed('Checkout dismissed by buyer. No payment was marked successful.') } };
    new Razorpay(options).open();
  } catch (error) { paymentFailed(error.message); }
  finally { $('approve').disabled = false; $('approve').innerHTML = 'Approve &amp; pay <span>→</span>'; }
}
async function verifyPayment(result) {
  try {
    const res = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) });
    const body = await res.json(); if (!res.ok || !body.verified) throw new Error(body.error || 'Verification failed');
    addAudit('Payment verified server-side', `Payment ${result.razorpay_payment_id} passed Razorpay signature verification.`); chat('Payment verified — your order is confirmed. Thank you!'); toast('Payment verified successfully.');
  } catch (error) { paymentFailed(`Payment returned from checkout but could not be verified: ${error.message}`); }
}
function paymentFailed(message) { addAudit('Payment not completed', message, 'error'); chat('That payment didn’t complete, so I have not marked your order as paid. You can safely try again when ready.'); toast('Payment not completed — safely handled.'); }
function reset() { basket = []; audit = []; $('audit').innerHTML = '<div class="audit-empty">Your agent’s decisions will be recorded here — including any failure.</div>'; $('chat').innerHTML = '<div class="message agent">Hi, I’m Lumi. Tell me who you’re shopping for, your budget, or choose a starter prompt below.</div>'; $('basketTitle').textContent = 'Awaiting your brief'; $('reason').classList.add('hidden'); renderBasket(); }

$('chatForm').addEventListener('submit', event => { event.preventDefault(); const input = $('message'); if (!input.value.trim()) return; chat(input.value, 'buyer'); recommend(input.value); input.value = ''; });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { chat(button.dataset.prompt, 'buyer'); recommend(button.dataset.prompt); }));
$('approve').addEventListener('click', checkout); $('reset').addEventListener('click', reset); $('failDemo').addEventListener('click', () => paymentFailed('Simulated gateway timeout. Order remains unpaid and retry is safe.'));
fetch('/api/config').then(r => r.json()).then(data => { config = data; if (!data.live) addAudit('Demo safety mode enabled', 'No Razorpay test keys found. Recommendations and failure handling work; add .env to enable real checkout.'); }).catch(() => {});
renderBasket();
