(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ME = SSAuth.current();
if (!ME) { location.replace('login.html'); return; }
const D = document.body.dataset;
const EXP = SS.EXPENSE, INC = SS.INCOME;
const CAT_ICONS = SS.CATEGORY_ICONS || {};

const CURRENCIES = {
  INR: { locale: 'en-IN', currency: 'INR' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  GBP: { locale: 'en-GB', currency: 'GBP' },
  JPY: { locale: 'ja-JP', currency: 'JPY' },
  CAD: { locale: 'en-CA', currency: 'CAD' },
  AUD: { locale: 'en-AU', currency: 'AUD' },
  AED: { locale: 'en-AE', currency: 'AED' }
};

let savedCurr = 'INR';
try { savedCurr = localStorage.getItem('ss-curr') || 'INR'; } catch (e) {}

const st = {
  tab: 'dash',
  month: D.month || (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })(),
  curr: savedCurr,
  charts: {},
  f: { q: '', category: '', type: '', all: false, sort: 'date', dir: 'desc' },
  edit: null
};

if ($('#month')) $('#month').value = st.month;
if ($('#curr-sel')) $('#curr-sel').value = st.curr;

const formatMoney = n => {
  const cfg = CURRENCIES[st.curr] || CURRENCIES.INR;
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    maximumFractionDigits: (cfg.currency === 'JPY' ? 0 : 0)
  }).format(n || 0);
};
const inr = formatMoney;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mName = m => new Date(m + '-01T00:00').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
const opts = (a, sel) => a.map(c => `<option${c === sel ? ' selected' : ''} value="${esc(c)}">${CAT_ICONS[c] ? CAT_ICONS[c] + ' ' : ''}${esc(c)}</option>`).join('');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const daysRemainingInMonth = m => {
  const today = new Date();
  const ym = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
  if (m !== ym) return 0;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - today.getDate() + 1);
};

/* theme */
try { const t = localStorage.getItem('ss-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
$('#theme').onclick = () => {
  const d = document.documentElement, dark = d.dataset.theme ? d.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  d.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('ss-theme', d.dataset.theme); } catch (e) {}
  show();
};

/* currency picker */
if ($('#curr-sel')) {
  $('#curr-sel').onchange = e => {
    st.curr = e.target.value;
    try { localStorage.setItem('ss-curr', st.curr); } catch (e) {}
    toast('Currency updated to ' + st.curr);
    show();
  };
}

/* month stepper */
const stepMonth = delta => {
  const [y, m] = st.month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  st.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if ($('#month')) $('#month').value = st.month;
  show();
};
if ($('#m-prev')) $('#m-prev').onclick = () => stepMonth(-1);
if ($('#m-next')) $('#m-next').onclick = () => stepMonth(1);

/* CSV helpers */
function exportCsv() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([SSLocal.exportCsv()], { type: 'text/csv' }));
  a.download = `smartspend-transactions-${st.month}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const reportLink = () => '<button class="b" id="r-print" type="button">🖨 Open printable report (save as PDF)</button>';
async function printReport(s) {
  const tx = (await api('/transactions?limit=500&month=' + st.month)).items, w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to open the report'); return; }
  const rows = a => a.join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SmartSpend report ${esc(st.month)}</title>
  <style>
    body{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:840px;margin:30px auto;padding:0 20px;color:#0f172a}
    table{width:100%;border-collapse:collapse;margin-bottom:24px;font-variant-numeric:tabular-nums}
    th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0}
    th{color:#64748b;font-size:12px;text-transform:uppercase}
    h1{color:#4338ca;margin:0 0 4px}
    .k{display:flex;gap:24px;margin:16px 0 24px;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
    .k b{display:block;font-size:22px;color:#1e293b;margin-top:2px}
    .subhead{color:#64748b;margin-bottom:18px}
    button{background:#4f46e5;color:#fff;border:0;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer}
    @media print{button{display:none}}
  </style>
  </head><body><button onclick="print()">🖨 Print / Save as PDF</button>
  <h1>Monthly Financial Statement</h1><p class="subhead">${mName(st.month)} · Generated on ${todayISO()}</p>
  <div class="k"><div>Income<b>${inr(s.income)}</b></div><div>Expenses<b>${inr(s.expense)}</b></div><div>Net Savings<b>${inr(s.net)}</b></div><div>Health Score<b>${s.score.score}/100 (${esc(s.score.label)})</b></div></div>
  <h2>Spending by Category</h2><table><tr><th>Category</th><th>Spent</th></tr>${rows(s.by_category.map(c => `<tr><td>${CAT_ICONS[c.category] ? CAT_ICONS[c.category] + ' ' : ''}${esc(c.category)}</td><td>${inr(c.amount)}</td></tr>`))}</table>
  <h2>Transactions Log (${tx.length})</h2><table><tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th></tr>${rows(tx.map(t => `<tr><td>${t.date}</td><td>${CAT_ICONS[t.category] ? CAT_ICONS[t.category] + ' ' : ''}${esc(t.category)}</td><td>${esc(t.note)}</td><td>${t.type === 'income' ? '+' : '−'}${inr(t.amount)}</td></tr>`))}</table></body></html>`);
  w.document.close();
}

/* JSON Backup & Restore */
async function backupJson() {
  try {
    const data = await api('/backup');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `smartspend-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('JSON backup downloaded');
  } catch (e) { toast('⚠️ ' + e.message); }
}

async function restoreJson(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed.data || parsed;
    const r = await api('/restore', { method: 'POST', body: { data } });
    toast(`Restored ${r.count} transactions successfully`);
    show();
  } catch (e) { toast('⚠️ Restore failed: ' + e.message); }
}

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 3800); }
const api = async (path, { method = 'GET', body } = {}) => SSLocal.handle(method, path, body);
const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast('⚠️ ' + e.message); } };

function countUp(root = document) {
  $$('[data-n]', root).forEach(el => {
    const to = +el.dataset.n, f = { p: v => Math.round(v) + '%', n: v => Math.round(v) }[el.dataset.f] || inr, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3); el.textContent = f(to * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
const animBars = () => requestAnimationFrame(() => requestAnimationFrame(() => $$('.bar i[data-w]').forEach(i => i.style.width = Math.min(100, Math.max(0, +i.dataset.w)) + '%')));

function confetti() {
  const c = document.createElement('canvas'); c.id = 'cf'; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const x = c.getContext('2d'); if (!x) { c.remove(); return; }
  const cols = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  const P = Array.from({ length: 140 }, () => ({ x: c.width / 2, y: c.height * .35, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 4, s: Math.random() * 8 + 4, r: Math.random() * 6, c: cols[Math.random() * 6 | 0] }));
  let f = 0; (function a() { x.clearRect(0, 0, c.width, c.height); P.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore(); }); if (++f < 150) requestAnimationFrame(a); else c.remove(); })();
}

function chart(id, cfg) {
  const el = $('#' + id); if (!window.Chart || !el) return;
  try { st.charts[id] && st.charts[id].destroy(); } catch (e) {}
  Chart.defaults.color = getComputedStyle(document.body).color;
  Chart.defaults.borderColor = 'rgba(128,128,128,.14)';
  Chart.defaults.animation = { duration: 1200, easing: 'easeOutQuart' };
  cfg.options = Object.assign({ maintainAspectRatio: false }, cfg.options);
  try { st.charts[id] = new Chart(el, cfg); } catch (e) { console.warn('Chart failed', e); }
}

const PAL = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16', '#14b8a6', '#94a3b8'];
const kpi = (ic, l, v, c, f) => `<div class="card kc"><div class="ic">${ic}</div><div class="mu">${l}</div><div class="kpi ${c}" data-n="${v}" data-f="${f}">0</div></div>`;

/* views */
const V = {};

V.dash = async el => {
  const s = await api('/summary?month=' + st.month), sc = s.score;
  const remDays = daysRemainingInMonth(st.month);
  const totalBudget = s.budgets.reduce((a, b) => a + b.limit, 0);
  const totalSpentInBudgets = s.budgets.reduce((a, b) => a + b.spent, 0);
  const remBudget = Math.max(0, totalBudget - totalSpentInBudgets);

  el.innerHTML = `${s.alerts.map(a => `<div class="alert ${a.level === 'danger' ? 'd' : ''}">${a.level === 'danger' ? '🚨' : '⚠️'} <b>${esc(a.category)}</b>: ${a.level === 'danger' ? 'budget reached' : a.pct + '% used'} (${inr(a.spent)} of ${inr(a.limit)})</div>`).join('')}
  <div class="grid">${kpi('💵', 'Income', s.income, 'ok', 'i')}${kpi('🛒', 'Expenses', s.expense, 'bad', 'i')}${kpi('🏦', 'Net savings', s.net, s.net >= 0 ? 'ok' : 'bad', 'i')}${kpi('📈', 'Savings rate', s.rate, s.rate >= 20 ? 'ok' : 'warn', 'p')}</div>
  
  <div class="grid mt">
    <div class="card">
      <h2>Financial health</h2>
      <div class="sc">
        <svg viewBox="0 0 120 120" width="150" height="150">
          <circle cx="60" cy="60" r="52" class="rt"/>
          <circle cx="60" cy="60" r="52" class="rf" id="ring"/>
        </svg>
        <div class="sn" data-n="${sc.score}" data-f="n">0</div>
      </div>
      <p class="mu" style="text-align:center;margin:12px 0 0">
        <b>${esc(sc.label)}</b><br>
        Savings ${sc.savings}/50 · Budgets ${sc.budgets}/30 · Goals ${sc.goals}/20
      </p>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h2>Daily spending vs budget pace</h2>
        ${totalBudget > 0 && remDays > 0 ? `<span class="mu" style="font-size:12px">Safe pace: <b>${inr(remBudget / remDays)}/day</b> (${remDays} days left)</span>` : ''}
      </div>
      <div class="ch"><canvas id="c3"></canvas></div>
    </div>
  </div>

  <div class="grid mt">
    <div class="card">
      <h2>Spending by category</h2>
      <div class="ch"><canvas id="c1"></canvas></div>
    </div>
    <div class="card">
      <h2>Six-month trend</h2>
      <div class="ch"><canvas id="c2"></canvas></div>
    </div>
  </div>

  <div class="card mt">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <h2>Spending heatmap · ${mName(st.month)}</h2>
      <span class="mu" style="font-size:12px">Darker color = higher spend · Click or hover a day to inspect</span>
    </div>
    <div class="heat-wrap">
      <div class="heat-weekdays">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div class="heat" id="heat"></div>
    </div>
  </div>`;

  countUp(el);
  const ring = $('#ring');
  ring.style.stroke = sc.score >= 75 ? '#10b981' : sc.score >= 50 ? '#f59e0b' : '#f43f5e';
  requestAnimationFrame(() => requestAnimationFrame(() => ring.style.strokeDashoffset = 326.7 * (1 - sc.score / 100)));

  const cats = s.by_category;
  chart('c1', {
    type: 'doughnut',
    data: {
      labels: cats.length ? cats.map(c => (CAT_ICONS[c.category] ? CAT_ICONS[c.category] + ' ' : '') + c.category) : ['No expenses'],
      datasets: [{
        data: cats.length ? cats.map(c => c.amount) : [1],
        backgroundColor: cats.length ? cats.map(c => PAL[EXP.indexOf(c.category) % PAL.length]) : ['#cbd5e1'],
        borderWidth: 2,
        borderRadius: 4
      }]
    },
    options: {
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, padding: 10 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${inr(ctx.raw)}` } }
      },
      cutout: '68%'
    }
  });

  chart('c2', {
    type: 'bar',
    data: {
      labels: s.trend.map(t => mName(t.month).slice(0, 3)),
      datasets: [
        { label: 'Income', data: s.trend.map(t => t.income), backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Expenses', data: s.trend.map(t => t.expense), backgroundColor: '#f43f5e', borderRadius: 6 }
      ]
    },
    options: {
      scales: { y: { beginAtZero: true } },
      plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${inr(ctx.raw)}` } } }
    }
  });

  let run = 0; const cum = s.daily.map(v => run += v), tb = s.budgets.reduce((a, b) => a + b.limit, 0), n = s.daily.length;
  chart('c3', {
    type: 'line',
    data: {
      labels: s.daily.map((_, i) => i + 1),
      datasets: [
        { label: 'Cumulative spend', data: cum, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.18)', fill: true, tension: .35, pointRadius: 2, borderWidth: 2.5 },
        ...(tb ? [{ label: 'Budget pace', data: s.daily.map((_, i) => tb * (i + 1) / n), borderColor: '#f59e0b', borderDash: [6, 6], pointRadius: 0, borderWidth: 2 }] : [])
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${inr(ctx.raw)}` } } }
    }
  });

  const mx = Math.max(...s.daily, 1), first = new Date(+st.month.slice(0, 4), +st.month.slice(5) - 1, 1).getDay();
  $('#heat').innerHTML = '<i style="visibility:hidden"></i>'.repeat(first) + s.daily.map((v, i) =>
    `<i class="${v ? '' : 'z'}" style="--a:${v / mx};animation-delay:${i * 12}ms" title="Day ${i + 1}: ${inr(v)}">${i + 1}</i>`
  ).join('');
};

V.tx = async el => {
  const f = st.f, p = new URLSearchParams({ limit: 250 });
  if (!f.all) p.set('month', st.month);
  ['q', 'category', 'type', 'sort', 'dir'].forEach(k => f[k] && p.set(k, f[k]));
  const r = await api('/transactions?' + p);

  const totalFilteredIncome = r.items.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalFilteredExpense = r.items.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  el.innerHTML = `<div class="card">
    <div class="row">
      <input id="f-q" placeholder="Search notes, merchants, or categories…" value="${esc(f.q)}" aria-label="Search transactions">
      <select id="f-type">
        <option value="">All types</option>
        <option value="expense"${f.type === 'expense' ? ' selected' : ''}>Expenses only</option>
        <option value="income"${f.type === 'income' ? ' selected' : ''}>Income only</option>
      </select>
      <select id="f-cat">
        <option value="">All categories</option>
        ${opts([...EXP, ...INC], f.category)}
      </select>
      <label class="mu" style="flex:0 0 auto;display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="f-all" ${f.all ? 'checked' : ''} style="min-width:0"> All months
      </label>
    </div>

    <div class="row" style="margin-top:4px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="b g" id="b-exp" type="button">⬇ Export CSV</button>
        <button class="b g" id="b-imp" type="button">⬆ Import CSV</button>
        <input type="file" id="imp" accept=".csv,text/csv" hidden>
      </div>
      <div style="text-align:right;font-size:12.5px" class="mu">
        ${r.total} transaction${r.total === 1 ? '' : 's'} · In: <b class="ok">+${inr(totalFilteredIncome)}</b> · Out: <b class="bad">−${inr(totalFilteredExpense)}</b>
      </div>
    </div>

    <div class="wrap" style="margin-top:12px">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Note</th>
            <th>Amount</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${r.items.map(t => {
            const icon = CAT_ICONS[t.category] || '🏷️';
            return `<tr>
              <td>${t.date}</td>
              <td><span class="cat-badge">${icon} ${esc(t.category)}</span></td>
              <td>${esc(t.note)}${t.recurring ? ' <span class="pill" title="Recurring rule entry">🔁 Recurring</span>' : ''}</td>
              <td class="${t.type === 'income' ? 'ok' : 'bad'}" style="font-weight:700">${t.type === 'income' ? '+' : '−'}${inr(t.amount)}</td>
              <td style="text-align:right">
                <button class="x" data-ed="${t.id}" title="Edit transaction">✎</button>
                <button class="x" data-del="${t.id}" title="Delete transaction">✕</button>
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="5" class="mu" style="text-align:center;padding:24px">No transactions match your search. Try adding one with the quick-add bar above.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>`;

  const re = () => show();
  let tm;
  $('#f-q').oninput = e => { f.q = e.target.value; clearTimeout(tm); tm = setTimeout(() => re(), 300); };
  $('#f-type').onchange = e => { f.type = e.target.value; re(); };
  $('#f-cat').onchange = e => { f.category = e.target.value; re(); };
  $('#f-all').onchange = e => { f.all = e.target.checked; re(); };
  $('#b-exp').onclick = () => exportCsv();
  $('#b-imp').onclick = () => $('#imp').click();
  $('#imp').onchange = guard(async e => {
    const file = e.target.files[0]; if (!file) return;
    const x = await api('/import', { method: 'POST', body: { csv: await file.text() } });
    toast(`Imported ${x.imported}, duplicates ${x.duplicates}, skipped ${x.skipped}` + (x.errors[0] ? ' · ' + x.errors[0] : ''));
    show();
  });

  el.onclick = guard(async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.del) { await api('/transactions/' + b.dataset.del, { method: 'DELETE' }); toast('Transaction deleted'); show(); }
    if (b.dataset.ed) openModal(r.items.find(t => t.id == b.dataset.ed));
  });

  const q = $('#f-q');
  if (document.activeElement === document.body && f.q) { q.focus(); q.setSelectionRange(f.q.length, f.q.length); }
};

V.bud = async el => {
  const [b, s] = await Promise.all([api('/budgets'), api('/summary?month=' + st.month)]);
  const sp = Object.fromEntries(s.by_category.map(c => [c.category, c.amount]));
  const totalBudget = Object.values(b.budgets).reduce((x, y) => x + (y || 0), 0);
  const totalSpent = s.expense;
  const remDays = daysRemainingInMonth(st.month);

  el.innerHTML = `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
      <h2>Monthly budgets · ${mName(st.month)}</h2>
      <div style="font-size:12.5px" class="mu">
        Total Budget: <b>${inr(totalBudget)}</b> · Spent: <b>${inr(totalSpent)}</b>
      </div>
    </div>
    <p class="mu">Alerts trigger automatically at 80% and 100% of limits. Set limits below, or leave blank for no limit.</p>
    
    ${EXP.map(c => {
      const l = b.budgets[c] || 0, a = sp[c] || 0, p = l ? a / l * 100 : 0;
      const col = p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--ok)';
      const icon = CAT_ICONS[c] || '🎯';
      const left = l ? l - a : 0;
      return `<div style="margin-bottom:16px;padding:12px;background:rgba(128,128,128,0.04);border-radius:12px;border:1px solid var(--bd)">
        <div class="row" style="margin-bottom:0">
          <b style="flex:1 1 120px;display:flex;align-items:center;gap:6px"><span>${icon}</span> ${esc(c)}</b>
          <span class="mu" style="flex:2 1 170px">
            <b>${inr(a)}</b> spent ${l ? 'of ' + inr(l) : ''}
            ${l ? (left >= 0 ? `· <span class="ok" style="font-size:11.5px">${inr(left)} left</span>` : `· <span class="bad" style="font-size:11.5px">${inr(Math.abs(left))} over</span>`) : ''}
          </span>
          <input type="number" min="0" placeholder="Limit ₹" value="${l || ''}" data-b="${c}" style="flex:1 1 110px">
        </div>
        <div class="bar"><i data-w="${p}" style="width:0;background:${col}"></i></div>
      </div>`;
    }).join('')}
  </div>`;

  el.onchange = guard(async e => {
    const c = e.target.dataset.b; if (!c) return;
    await api('/budgets', { method: 'PUT', body: { [c]: e.target.value ? +e.target.value : null } });
    toast('Budget saved for ' + c);
    show();
  });
};

V.goal = async el => {
  const g = (await api('/goals')).items;
  el.innerHTML = `<div class="card">
    <h2>New savings goal</h2>
    <div class="row">
      <input id="g-n" placeholder="Goal name (e.g. New Laptop, Emergency Fund, Bali Vacation)" maxlength="60">
      <input id="g-t" type="number" min="1" placeholder="Target amount (₹)">
      <button class="b" id="g-add" type="button">＋ Add Goal</button>
    </div>
  </div>

  <div class="grid">
    ${g.map(x => {
      const p = Math.min(100, x.saved / x.target * 100);
      const remaining = Math.max(0, x.target - x.saved);
      return `<div class="card">
        <div class="row" style="margin-bottom:4px">
          <b>🎯 ${esc(x.name)}</b>
          <button class="x" data-gd="${x.id}" style="flex:0 0 auto" title="Delete Goal">✕</button>
        </div>
        <div class="kpi" data-n="${p}" data-f="p">0</div>
        <div class="mu" style="margin-bottom:6px">
          ${inr(x.saved)} of ${inr(x.target)} ${remaining > 0 ? `· <span class="info">${inr(remaining)} left</span>` : '· <span class="ok">🎉 Completed!</span>'}
        </div>
        <div class="bar"><i data-w="${p}" style="width:0"></i></div>
        <div class="row" style="margin:12px 0 0">
          <input type="number" min="1" placeholder="Amount" id="ga-${x.id}">
          <button class="b" data-ga="${x.id}" style="flex:0 0 auto">Deposit</button>
          <button class="b g" data-gw="${x.id}" style="flex:0 0 auto" title="Withdraw funds">Withdraw</button>
        </div>
      </div>`;
    }).join('') || '<p class="mu" style="grid-column:1/-1;text-align:center;padding:24px">No savings goals yet. Create one above to track your milestones!</p>'}
  </div>`;

  countUp(el);

  $('#g-add').onclick = guard(async () => {
    await api('/goals', { method: 'POST', body: { name: $('#g-n').value, target: $('#g-t').value } });
    toast('Savings goal created');
    show();
  });

  el.onclick = guard(async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ga) {
      const inp = $('#ga-' + b.dataset.ga);
      const r = await api(`/goals/${b.dataset.ga}/deposit`, { method: 'POST', body: { amount: inp.value } });
      if (r.reached) { toast('🎉 Goal reached: ' + r.goal.name); confetti(); } else toast('Deposit saved');
      show();
    }
    if (b.dataset.gw) {
      const inp = $('#ga-' + b.dataset.gw);
      await api(`/goals/${b.dataset.gw}/withdraw`, { method: 'POST', body: { amount: inp.value } });
      toast('Funds withdrawn');
      show();
    }
    if (b.dataset.gd) {
      await api('/goals/' + b.dataset.gd, { method: 'DELETE' });
      toast('Goal removed');
      show();
    }
  });
};

V.rec = async el => {
  const r = (await api('/recurring')).items;
  const totalMonthly = r.reduce((a, b) => a + (b.type === 'expense' ? b.amount : 0), 0);

  el.innerHTML = `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
      <h2>Recurring transactions & Subscriptions</h2>
      ${totalMonthly > 0 ? `<span class="mu" style="font-size:12.5px">Total monthly commitments: <b class="bad">${inr(totalMonthly)}</b></span>` : ''}
    </div>
    <div class="row">
      <select id="r-t"><option value="expense">Expense</option><option value="income">Income</option></select>
      <input id="r-a" type="number" min="1" placeholder="Amount (₹)">
      <select id="r-c">${opts(EXP)}</select>
      <input id="r-d" type="number" min="1" max="28" placeholder="Day of month (1–28)">
      <input id="r-n" placeholder="Name (e.g. Rent, Netflix, Gym, Salary)" maxlength="60">
      <button class="b" id="r-add" type="button">＋ Add Rule</button>
    </div>
    <p class="mu">Entries are created automatically on their day each month, never duplicated. Delete a generated transaction from the Transactions tab to skip that month.</p>
    
    <div class="wrap" style="margin-top:12px">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Day of Month</th>
            <th style="text-align:right"></th>
          </tr>
        </thead>
        <tbody>
          ${r.map(x => `<tr>
            <td><b>${esc(x.note)}</b></td>
            <td><span class="cat-badge">${CAT_ICONS[x.category] || '🔁'} ${esc(x.category)}</span></td>
            <td class="${x.type === 'income' ? 'ok' : 'bad'}" style="font-weight:700">${x.type === 'income' ? '+' : '−'}${inr(x.amount)}</td>
            <td>Day ${x.day}</td>
            <td style="text-align:right"><button class="x" data-rd="${x.id}" title="Remove rule">✕</button></td>
          </tr>`).join('') || '<tr><td colspan="5" class="mu" style="text-align:center;padding:20px">No recurring items configured yet. Add your rent, subscriptions or salary above.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>`;

  $('#r-t').onchange = e => { $('#r-c').innerHTML = opts(e.target.value === 'expense' ? EXP : INC); };
  $('#r-add').onclick = guard(async () => {
    await api('/recurring', { method: 'POST', body: { type: $('#r-t').value, amount: $('#r-a').value, category: $('#r-c').value, day: $('#r-d').value, note: $('#r-n').value } });
    toast('Recurring item added');
    show();
  });
  el.onclick = guard(async e => {
    const b = e.target.closest('button');
    if (b && b.dataset.rd) { await api('/recurring/' + b.dataset.rd, { method: 'DELETE' }); toast('Rule removed'); show(); }
  });
};

V.ins = async el => {
  const i = await api('/insights?month=' + st.month), f = i.forecast, rec = i.recommendations, avgs = Object.entries(i.averages).filter(([, v]) => v > 0);
  const r50 = i.rule503020;

  el.innerHTML = `<div class="grid">
    <div class="card">
      <h2>🔮 Forecast${f ? ' · ' + mName(f.target) : ''}</h2>
      ${f ? `<div class="kpi" data-n="${f.next}" data-f="i">0</div>
        <div class="range"><i style="left:0;width:0" id="rg" data-lo="${f.low}" data-hi="${f.high}"></i></div>
        <p class="mu">Likely range <b>${inr(f.low)}</b> – <b>${inr(f.high)}</b> · trend <b>${f.trend}</b><br>Method: ${esc(f.method)} over ${f.months_used} months</p>` :
        '<p class="mu">Add at least two months of expenses (or load demo data) to generate predictive forecasts.</p>'}
    </div>

    <div class="card">
      <h2>⚠️ Unusual spending</h2>
      ${i.anomalies.map(a => `<div class="alert">
        ${a.date} · <b>${CAT_ICONS[a.category] ? CAT_ICONS[a.category] + ' ' : ''}${esc(a.category)}</b> ${inr(a.amount)}${a.note ? ' (' + esc(a.note) + ')' : ''}<br>
        <span class="mu">${a.ratio}× your typical ${inr(a.typical)}</span>
      </div>`).join('') || '<p class="mu">Nothing unusual detected this month. High-variance purchases will be flagged here.</p>'}
    </div>

    <div class="card">
      <h2>🔁 Detected subscriptions</h2>
      ${i.subscriptions.map(s => `<div class="row" style="margin-bottom:6px">
        <b>${esc(s.name)}</b>
        <span>${inr(s.monthly)}/mo</span>
        <span class="mu">${inr(s.yearly)}/yr</span>
      </div>`).join('') || '<p class="mu">No repeating charges detected yet (requires 3+ months of history).</p>'}
    </div>
  </div>

  ${r50 ? `<div class="card mt">
    <h2>⚖️ 50/30/20 Financial Health Guideline</h2>
    <p class="mu">The benchmark: 50% Needs, 30% Wants, 20% Savings.</p>
    <div class="rule-bar">
      <div class="rule-seg" style="width:${r50.needs.pct}%;background:#6366f1" title="Needs: ${r50.needs.pct}%"></div>
      <div class="rule-seg" style="width:${r50.wants.pct}%;background:#ec4899" title="Wants: ${r50.wants.pct}%"></div>
      <div class="rule-seg" style="width:${r50.savings.pct}%;background:#10b981" title="Savings: ${r50.savings.pct}%"></div>
    </div>
    <div class="rule-legend">
      <span class="rule-leg-item"><i class="rule-dot" style="background:#6366f1"></i> Needs: <b>${inr(r50.needs.amount)}</b> (${r50.needs.pct}% vs 50%)</span>
      <span class="rule-leg-item"><i class="rule-dot" style="background:#ec4899"></i> Wants: <b>${inr(r50.wants.amount)}</b> (${r50.wants.pct}% vs 30%)</span>
      <span class="rule-leg-item"><i class="rule-dot" style="background:#10b981"></i> Savings: <b>${inr(r50.savings.amount)}</b> (${r50.savings.pct}% vs 20%)</span>
    </div>
  </div>` : ''}

  <div class="card mt">
    <h2>💡 Budget recommendations</h2>
    ${rec.tips.map(t => `<p class="mu" style="margin-bottom:6px">• ${esc(t)}</p>`).join('')}
    ${Object.keys(rec.budgets).length ? `<div class="wrap" style="margin-top:10px">
      <table>
        <thead><tr><th>Category</th><th>Average / Month</th><th>Suggested Limit</th></tr></thead>
        <tbody>
          ${Object.entries(rec.budgets).map(([c, v]) => `<tr><td>${CAT_ICONS[c] ? CAT_ICONS[c] + ' ' : ''}${esc(c)}</td><td>${inr(i.averages[c])}</td><td><b>${inr(v)}</b></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p><button class="b" id="apply" type="button">Apply suggested budgets</button></p>` :
    '<p class="mu">Add some expenses to get smart recommendations.</p>'}
  </div>

  <div class="card mt">
    <h2>🧪 What-if simulator</h2>
    ${avgs.length ? `<div class="row">
      <select id="w-c">${avgs.map(([c]) => `<option value="${esc(c)}">${CAT_ICONS[c] ? CAT_ICONS[c] + ' ' : ''}${esc(c)}</option>`).join('')}</select>
      <input id="w-p" type="range" min="0" max="100" value="20" style="padding:0">
      <b id="w-v" style="flex:0 0 50px">20%</b>
    </div>
    <p id="w-o" class="kpi ok" style="font-size:18px"></p>` : '<p class="mu">Needs spending history to simulate.</p>'}
  </div>`;

  countUp(el);
  const rg = $('#rg');
  if (rg && f) {
    const mx = f.high * 1.25 || 1;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rg.style.left = (f.low / mx * 100) + '%';
      rg.style.width = Math.max(2, (f.high - f.low) / mx * 100) + '%';
    }));
  }

  const ap = $('#apply');
  if (ap) ap.onclick = guard(async () => { await api('/budgets', { method: 'PUT', body: rec.budgets }); toast('Budgets updated'); });

  if (avgs.length) {
    const calc = () => {
      const c = $('#w-c').value, p = +$('#w-p').value, m = (i.averages[c] || 0) * p / 100;
      $('#w-v').textContent = p + '%';
      $('#w-o').textContent = `Cutting ${c} by ${p}% saves ${inr(m)}/month · ${inr(m * 12)}/year`;
    };
    ['#w-c', '#w-p'].forEach(s => $(s).oninput = calc);
    calc();
  }
};

V.rep = async el => {
  const s = await api('/summary?month=' + st.month);
  el.innerHTML = `<div class="card">
    <h2>Report · ${mName(st.month)}</h2>
    <p>Income <b class="ok">${inr(s.income)}</b> · Expenses <b class="bad">${inr(s.expense)}</b> · Net <b class="${s.net >= 0 ? 'ok' : 'bad'}">${inr(s.net)}</b> · Health score <b>${s.score.score}/100</b></p>
    <div class="row" style="margin-top:14px">
      ${reportLink()}
      <button class="b g" id="r-csv" type="button">⬇ Export CSV</button>
      <button class="b g" id="b-json-backup" type="button">📦 Backup (JSON)</button>
      <button class="b g" id="b-json-restore" type="button">📥 Restore (JSON)</button>
      <input type="file" id="json-file-input" accept=".json,application/json" hidden>
    </div>

    <div class="wrap" style="margin-top:18px">
      <table>
        <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Savings</th></tr></thead>
        <tbody>
          ${[...s.trend].reverse().map(t => `<tr><td><b>${mName(t.month)}</b></td><td class="ok">+${inr(t.income)}</td><td class="bad">−${inr(t.expense)}</td><td class="${t.income - t.expense >= 0 ? 'ok' : 'bad'}">${inr(t.income - t.expense)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;

  $('#r-csv').onclick = () => exportCsv();
  const pb = $('#r-print'); if (pb) pb.onclick = guard(() => printReport(s));
  $('#b-json-backup').onclick = backupJson;
  $('#b-json-restore').onclick = () => $('#json-file-input').click();
  $('#json-file-input').onchange = e => {
    const f = e.target.files[0];
    if (f) restoreJson(f);
  };
};

V.admin = async el => {
  const a = SSAuth.adminInfo();
  el.innerHTML = `<div class="card">
    <h2>🛡 Administration</h2>
    <p class="mu">${a.users.length} registered user${a.users.length === 1 ? '' : 's'} · ${a.tx} transactions stored across all accounts (browser local-first storage)</p>
    <div class="wrap" style="margin-top:12px">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>E-mail</th><th>Role</th><th>Transactions</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          ${a.users.map(u => `<tr>
            <td>${u.id}</td>
            <td><b>${esc(u.name)}</b></td>
            <td>${esc(u.email)}</td>
            <td><span class="pill" style="background:${u.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(128,128,128,0.1)'}">${u.role}</span></td>
            <td>${u.tx}</td>
            <td>${esc(u.created)}</td>
            <td>${u.id !== ME.id ? `<button class="x" data-ud="${u.id}" title="Delete User">✕</button>` : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card mt">
    <h2>Recent activity (audit log)</h2>
    <div class="wrap">
      <table>
        <thead><tr><th>Timestamp</th><th>User</th><th>Action</th></tr></thead>
        <tbody>
          ${a.log.map(l => `<tr><td>${esc(l.at)}</td><td>${esc(l.email || '–')}</td><td><b>${esc(l.action)}</b>${l.detail ? ' · ' + esc(l.detail) : ''}</td></tr>`).join('') || '<tr><td colspan="3" class="mu">No activity logged yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>`;

  el.onclick = guard(async e => {
    const b = e.target.closest('button');
    if (b && b.dataset.ud) {
      if (!confirm('Are you sure you want to delete this user and all their private data?')) return;
      SSAuth.deleteUser(+b.dataset.ud);
      toast('User deleted');
      show();
    }
  });
};

/* navigation */
const TABS = [
  ['dash', '📊 Dashboard'],
  ['tx', '🧾 Transactions'],
  ['bud', '🎯 Budgets'],
  ['goal', '🏆 Goals'],
  ['rec', '🔁 Recurring'],
  ['ins', '🔮 Insights'],
  ['rep', '📄 Reports']
];
if (ME.role === 'admin') TABS.push(['admin', '🛡 Admin']);

$('#who').textContent = '👤 ' + ME.name;
$('#who').title = ME.email + (ME.role === 'admin' ? ' (Admin)' : '');
$('#nav').innerHTML = TABS.map(([k, l]) => `<button data-k="${k}">${l}</button>`).join('');
$('#nav').onclick = e => { const b = e.target.closest('button'); if (!b || !b.dataset.k) return; go(b.dataset.k); };

function go(k) { st.tab = k; location.hash = k; show(); }

const show = guard(async () => {
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.k === st.tab));
  $('.qa').hidden = st.tab !== 'dash';
  const el = $('#view');
  el.onclick = null;
  el.onchange = null;
  el.innerHTML = '<div class="sk"></div><div class="sk"></div>';
  await V[st.tab](el);
  animBars();
});

$('#month').onchange = e => { if (e.target.value) { st.month = e.target.value; show(); } };

/* add / edit modal */
function openModal(t) {
  st.edit = t || null;
  $('#mt').textContent = t ? 'Edit transaction' : 'Add transaction';
  $('#m-type').value = t ? t.type : 'expense';
  fillCats(t && t.category);
  $('#m-amt').value = t ? t.amount : '';
  $('#m-date').value = t ? t.date : todayISO();
  $('#m-note').value = t ? t.note : '';
  $('#modal').hidden = false;
  $('#m-amt').focus();
}

const fillCats = sel => { $('#m-cat').innerHTML = opts($('#m-type').value === 'expense' ? EXP : INC, sel); };
$('#m-type').onchange = () => fillCats();
$('#add').onclick = () => openModal();
$('#m-cancel').onclick = () => $('#modal').hidden = true;
if ($('#m-x')) $('#m-x').onclick = () => $('#modal').hidden = true;

$('#m-save').onclick = guard(async () => {
  const body = { type: $('#m-type').value, amount: $('#m-amt').value, category: $('#m-cat').value, date: $('#m-date').value, note: $('#m-note').value };
  const r = st.edit ? await api('/transactions/' + st.edit.id, { method: 'PUT', body }) : await api('/transactions', { method: 'POST', body });
  $('#modal').hidden = true;
  alertToast(r.alert, st.edit ? 'Transaction updated' : 'Transaction added');
  show();
});

function alertToast(a, fallback) {
  toast(a ? (a.level === 'danger' ? `🚨 ${a.category} budget reached (${inr(a.spent)} of ${inr(a.limit)})` : `⚠️ ${a.category} is at ${a.pct}% of its budget`) : fallback);
}

/* quick add */
let qt; const qa = $('#qa'), qp = $('#qp');
qa.oninput = () => {
  clearTimeout(qt);
  if (!qa.value.trim()) { qp.textContent = ''; return; }
  qt = setTimeout(async () => {
    try {
      const p = (await api('/quick-add?preview=1', { method: 'POST', body: { text: qa.value } })).parsed;
      qp.textContent = `→ ${p.type} · ${inr(p.amount)} · ${p.category} · ${p.date} · “${p.note}”  (press Enter to save)`;
    } catch (e) { qp.textContent = e.message; }
  }, 250);
};

qa.onkeydown = guard(async e => {
  if (e.key !== 'Enter' || !qa.value.trim()) return;
  const r = await api('/quick-add', { method: 'POST', body: { text: qa.value } });
  qa.value = ''; qp.textContent = '';
  alertToast(r.alert, `Added ${inr(r.item.amount)} · ${r.item.category} · ${r.item.note}`);
  show();
});

// Quick suggestion chips
$$('.qa-chip').forEach(btn => {
  btn.onclick = () => {
    const t = btn.dataset.t; if (!t) return;
    qa.value = t;
    qa.dispatchEvent(new Event('input', { bubbles: true }));
    qa.focus();
  };
});

/* command palette */
const CMDS = [
  ...TABS.map(([k, l]) => [l, () => go(k)]),
  ['＋ Add transaction', () => openModal()],
  ['✨ Load demo data', demo],
  ['⬇ Export CSV', () => exportCsv()],
  ['📦 Backup data (JSON)', backupJson],
  ['🌓 Toggle theme', () => $('#theme').click()],
  ['⌨️ Keyboard shortcuts', openShortcuts],
  ['🗑 Reset all data', reset],
  ['🚪 Log out', logout]
];

async function demo() {
  let r;
  try { r = await api('/demo', { method: 'POST', body: {} }); }
  catch (e) {
    if (!/already/.test(e.message)) return toast('⚠️ ' + e.message);
    if (!confirm('Replace your current data with demo data?')) return;
    r = await api('/demo', { method: 'POST', body: { replace: true } });
  }
  toast(`Demo data loaded (${r.count} transactions)`);
  confetti();
  show();
}

async function reset() {
  if (!confirm('Delete ALL your transactions, budgets, goals and recurring items? This cannot be undone.')) return;
  await api('/reset', { method: 'POST', body: {} });
  toast('All data cleared');
  show();
}

function logout() { SSAuth.logout(); location.href = 'login.html'; }

function openShortcuts() {
  const m = $('#shortcuts-modal');
  if (m) m.hidden = false;
}
if ($('#shortcuts-btn')) $('#shortcuts-btn').onclick = openShortcuts;
if ($('#sc-x')) $('#sc-x').onclick = () => { $('#shortcuts-modal').hidden = true; };
if ($('#sc-close')) $('#sc-close').onclick = () => { $('#shortcuts-modal').hidden = true; };

let sel = 0;
const list = () => {
  const q = $('#p-in').value.toLowerCase();
  return CMDS.filter(c => c[0].toLowerCase().includes(q));
};

function drawPal() {
  const l = list();
  sel = Math.min(sel, Math.max(0, l.length - 1));
  $('#p-list').innerHTML = l.map((c, i) =>
    `<button type="button" data-i="${i}" class="${i === sel ? 'sel' : ''}"><span>${esc(c[0])}</span><span class="kbd">↵</span></button>`
  ).join('');
}

function openPal() {
  $('#palette').hidden = false;
  $('#p-in').value = '';
  sel = 0;
  drawPal();
  $('#p-in').focus();
}

const run = i => {
  const c = list()[i];
  $('#palette').hidden = true;
  c && c[1]();
};

$('#pal').onclick = openPal;
$('#p-in').oninput = () => { sel = 0; drawPal(); };
$('#p-list').onclick = e => { const b = e.target.closest('button'); if (b) run(+b.dataset.i); };
$('#p-in').onkeydown = e => {
  const n = list().length;
  if (e.key === 'ArrowDown') { sel = (sel + 1) % n; drawPal(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = (sel - 1 + n) % n; drawPal(); e.preventDefault(); }
  else if (e.key === 'Enter') run(sel);
};

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPal(); }
  else if (e.key === 'Escape') {
    $('#palette').hidden = true;
    $('#modal').hidden = true;
    if ($('#shortcuts-modal')) $('#shortcuts-modal').hidden = true;
  } else if (!e.ctrlKey && !e.metaKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'n') { e.preventDefault(); openModal(); }
    else if (e.key === '/') { e.preventDefault(); $('#qa').focus(); }
    else if (e.key === '?') { e.preventDefault(); openShortcuts(); }
    else if (e.key === 't') { $('#theme').click(); }
    else if (e.key === '[') { stepMonth(-1); }
    else if (e.key === ']') { stepMonth(1); }
    else if (e.key >= '1' && e.key <= '7') {
      const idx = +e.key - 1;
      if (TABS[idx]) go(TABS[idx][0]);
    }
  }
});

if ($('#logout')) $('#logout').onclick = logout;
$('#demo').onclick = guard(demo);
$('#reset').onclick = guard(reset);

const h = location.hash.slice(1);
if (V[h]) st.tab = h;
show();
})();