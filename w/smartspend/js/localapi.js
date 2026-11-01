/* SmartSpend: app logic and storage. A small in-browser "API" (routes such as /transactions, /summary, /insights)
   that keeps everything in localStorage, so the app works by double-click with no server. */
(function (root) {
"use strict";
const A = root.SS || (typeof require !== "undefined" ? require("./analytics.js") : null), KEY = "smartspend-data-" + (root.SSAuth ? root.SSAuth.currentId() : "guest");
class ApiError extends Error { constructor(m, s = 400) { super(m); this.status = s; } }
const blank = () => ({ tx: [], budgets: {}, recurring: [], skips: [], goals: [], seq: 1 });
let S = blank(), store = null;
try { store = root.localStorage; const r = store && store.getItem(KEY); if (r) S = Object.assign(blank(), JSON.parse(r)); } catch (e) { store = null; }
const save = () => { try { store && store.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date()), curMonth = () => todayISO().slice(0, 7);
const addMonth = (m, n) => { const t = +m.slice(0, 4) * 12 + (+m.slice(5)) - 1 + n; return `${String(Math.floor(t / 12)).padStart(4, "0")}-${pad(t % 12 + 1)}`; };
const monthOk = m => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m || "")) throw new ApiError("Month must look like 2026-10"); return m; };
const daysIn = m => new Date(+m.slice(0, 4), +m.slice(5), 0).getDate();
const sum = a => a.reduce((x, y) => x + y, 0), r1 = x => Math.round(x * 10) / 10;
const toCents = v => {
  const n = Number(v); if (v === "" || v === null || v === undefined || !isFinite(n)) throw new ApiError("Amount must be a number");
  const c = Math.round((n + Number.EPSILON) * 100); if (!(c > 0 && c <= 1e11)) throw new ApiError("Amount must be greater than 0"); return c;
};
function clean(d) {
  d = d || {}; const t = d.type, cat = d.category, note = String(d.note == null ? "" : d.note).trim().slice(0, 200);
  if (t !== "income" && t !== "expense") throw new ApiError("Type must be income or expense");
  if (!(t === "expense" ? A.EXPENSE : A.INCOME).includes(cat)) throw new ApiError("Invalid category for this type");
  const ds = String(d.date), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds); let ok = false;
  if (m) { const x = new Date(+m[1], +m[2] - 1, +m[3]); ok = x.getFullYear() === +m[1] && x.getMonth() === +m[2] - 1 && x.getDate() === +m[3]; }
  if (!ok) throw new ApiError("Date must look like 2026-10-31");
  return { type: t, category: cat, date: ds, cents: toCents(d.amount), note };
}
const ser = t => ({ id: t.id, date: t.date, type: t.type, category: t.category, amount: t.cents / 100, note: t.note, recurring: t.rid != null });
const getTx = id => { const t = S.tx.find(x => x.id === +id); if (!t) throw new ApiError("Transaction not found", 404); return t; };
const newTx = (c, rid = null) => { const t = { id: S.seq++, date: c.date, type: c.type, category: c.category, cents: c.cents, note: c.note, rid }; S.tx.push(t); return t; };

function genRecurring() {
  const today = todayISO(), cm = today.slice(0, 7); let ch = false;
  for (const r of S.recurring) for (let m = r.start_month; m <= cm; m = addMonth(m, 1)) {
    const d = `${m}-${pad(r.day)}`;
    if (d <= today && !S.skips.includes(r.id + "|" + m) && !S.tx.some(t => t.rid === r.id && t.date.slice(0, 7) === m)) {
      newTx({ date: d, type: r.type, category: r.category, cents: r.cents, note: r.note }, r.id); ch = true; }
  }
  if (ch) save();
}
const spentIn = m => { const o = {}; for (const t of S.tx) if (t.type === "expense" && t.date.startsWith(m)) o[t.category] = (o[t.category] || 0) + t.cents; return o; };
function budgetAlert(t) {
  if (t.type !== "expense") return null; const lim = S.budgets[t.category]; if (!lim) return null;
  const after = spentIn(t.date.slice(0, 7))[t.category] || 0, before = after - t.cents;
  const level = before < lim && lim <= after ? "danger" : before < lim * .8 && lim * .8 <= after ? "warn" : null;
  return level && { level, category: t.category, pct: Math.round(after / lim * 100), spent: after / 100, limit: lim / 100 };
}
const goalList = () => S.goals.map(g => ({ id: g.id, name: g.name, target: g.target / 100, saved: g.saved / 100 }));
const recList = () => [...S.recurring].sort((a, b) => a.day - b.day).map(r => ({ id: r.id, type: r.type, category: r.category, amount: r.cents / 100, day: r.day, note: r.note }));
const budgetsMap = () => Object.fromEntries(Object.entries(S.budgets).map(([c, v]) => [c, v / 100]));

function monthTotals(months) {
  const o = {}; months.forEach(m => o[m] = { income: 0, expense: 0 });
  for (const t of S.tx) { const m = t.date.slice(0, 7); if (o[m]) o[m][t.type] += t.cents / 100; } return o;
}
function buildSummary(m) {
  genRecurring(); let inc = 0, exp = 0; const by = {}, daily = Array(daysIn(m)).fill(0);
  for (const t of S.tx) { if (!t.date.startsWith(m)) continue; if (t.type === "income") inc += t.cents; else { exp += t.cents; by[t.category] = (by[t.category] || 0) + t.cents; daily[+t.date.slice(8) - 1] += t.cents / 100; } }
  inc /= 100; exp /= 100;
  const usage = Object.entries(S.budgets).map(([c, l]) => { const sp = (by[c] || 0) / 100; return { category: c, limit: l / 100, spent: sp, pct: r1(sp / (l / 100) * 100) }; });
  const alerts = usage.filter(u => u.pct >= 80).map(u => Object.assign({}, u, { level: u.pct >= 100 ? "danger" : "warn" }));
  const goals = goalList(), gr = goals.length ? sum(goals.map(x => Math.min(1, x.saved / x.target))) / goals.length : .5;
  const ok = usage.length ? usage.filter(u => u.spent < u.limit).length / usage.length : 1;
  const months = [5, 4, 3, 2, 1, 0].map(i => addMonth(m, -i)), tot = monthTotals(months);
  return { month: m, income: inc, expense: exp, net: inc - exp, rate: inc ? Math.round((inc - exp) / inc * 100) : 0,
    by_category: Object.entries(by).sort((a, b) => b[1] - a[1]).map(([category, c]) => ({ category, amount: c / 100 })),
    trend: months.map(k => Object.assign({ month: k }, tot[k])), daily, budgets: usage, alerts, score: A.healthScore(inc, exp, ok, gr), goals };
}
function insights(m) {
  genRecurring(); const complete = m < curMonth(), hist = [];
  for (let i = 12; i >= (complete ? 0 : 1); i--) hist.push(addMonth(m, -i));
  const tot = monthTotals(hist), series = hist.map(k => tot[k].expense); while (series.length && series[0] === 0) series.shift();
  const fc = A.forecast(series); if (fc) fc.target = complete ? addMonth(m, 1) : m;
  const lo = addMonth(m, -12), rows = S.tx.filter(t => t.type === "expense" && t.date.slice(0, 7) >= lo && t.date.slice(0, 7) <= m).map(t => ({ id: t.id, date: t.date, category: t.category, amount: t.cents / 100, note: t.note }));
  const win = [3, 2, 1].map(i => addMonth(m, -i)), sums = {}, seen = new Set();
  for (const t of S.tx) { const k = t.date.slice(0, 7); if (t.type === "expense" && k >= win[0] && k <= win[2]) { sums[t.category] = (sums[t.category] || 0) + t.cents / 100; seen.add(k); } }
  let avg = {}; for (const [c, v] of Object.entries(sums)) avg[c] = v / Math.max(1, seen.size);
  const s = buildSummary(m); if (!Object.keys(avg).length) avg = Object.fromEntries(s.by_category.map(c => [c.category, c.amount]));
  return { forecast: fc, anomalies: A.anomalies(rows, m), subscriptions: A.subscriptions(rows), recommendations: A.recommendations(avg, s.income), averages: avg, rule503020: A.rule503020 ? A.rule503020(avg, s.income) : null };
}

/* CSV */
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else f += c; }
  if (f !== "" || row.length) { row.push(f); rows.push(row); } return rows;
}
const safe = v => { v = String(v); return "=+-@\t\r".includes(v[0] || "x") ? "'" + v : v; };
const qcsv = v => /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
function exportCsv() {
  return ["Date,Type,Category,Amount,Note", ...[...S.tx].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .map(t => [t.date, t.type, t.category, (t.cents / 100).toFixed(2), qcsv(safe(t.note))].join(","))].join("\n") + "\n";
}
function importCsv(text) {
  const rows = parseCSV(String(text || "")), head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  if (!["date", "type", "amount"].every(h => head.includes(h))) throw new ApiError("CSV needs the columns Date, Type, Category, Amount, Note");
  let imported = 0, dup = 0, skipped = 0; const errors = [];
  rows.forEach((cells, i) => {
    const n = i + 2; if (n > 2001) { if (n === 2002) errors.push("Stopped at 2000 rows"); return; }
    const r = {}; head.forEach((h, k) => r[h] = (cells[k] || "").trim()); let c;
    try {
      const t = (r.type || "").toLowerCase(), allowed = t === "expense" ? A.EXPENSE : A.INCOME;
      const cat = allowed.includes(r.category) ? r.category : (t === "expense" ? "Other" : "Other income");
      let note = r.note || ""; if (/^'[=+\-@]/.test(note)) note = note.slice(1);
      c = clean({ type: t, category: cat, date: r.date, amount: r.amount, note });
    } catch (e) { skipped++; if (errors.length < 5) errors.push(`Row ${n}: ${e.message}`); return; }
    if (S.tx.some(t => t.date === c.date && t.type === c.type && t.category === c.category && t.cents === c.cents && t.note === c.note)) { dup++; return; }
    newTx(c); imported++;
  });
  save(); return { imported, duplicates: dup, skipped, errors };
}

/* demo data (seeded so it looks the same every time): 8 months of realistic activity */
function demo(replace) {
  if (!replace && S.tx.length) throw new ApiError("You already have data. Confirm to replace it.", 409);
  S = blank(); let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const uni = (a, b) => a + rnd() * (b - a), int = (a, b) => Math.floor(uni(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length)];
  const today = todayISO(), cm = today.slice(0, 7), day = () => pad(int(2, 27));
  const add = (date, type, category, cents, note) => { if (date <= today) newTx({ date, type, category, cents, note }); };
  // rules that generate entries automatically every month
  [["income", "Salary", 5500000, 1, "Monthly salary"], ["expense", "Rent", 1500000, 5, "Rent"], ["expense", "Health", 120000, 3, "Gym membership"],
   ["expense", "Bills", 79900, 10, "Wi-Fi broadband"], ["expense", "Entertainment", 64900, 12, "Netflix subscription"], ["expense", "Entertainment", 11900, 14, "Spotify Premium"],
   ["expense", "Bills", 39900, 20, "Mobile recharge"]].forEach(([type, category, cents, d, note]) => S.recurring.push({ id: S.seq++, type, category, cents, day: d, note, start_month: addMonth(cm, -7) }));
  const notes = { Food: ["Swiggy dinner", "Groceries", "Coffee", "Lunch with friends", "Zomato order", "Biryani", "Snacks", "Milk and bread"], Transport: ["Uber ride", "Metro recharge", "Petrol", "Auto fare", "Rapido bike"], Shopping: ["Amazon order", "Myntra clothes", "New shoes", "Headphones", "Home decor"] };
  const plan = [["Food", 10, 14, 5200, 7600], ["Transport", 4, 8, 1500, 2600], ["Shopping", 1, 3, 1800, 5200]];
  for (let k = 7; k >= 0; k--) {
    const m = addMonth(cm, -k);
    for (const [cat, lo, hi, tl, th] of plan) { const cnt = int(lo, hi), total = uni(tl, th); for (let j = 0; j < cnt; j++) add(`${m}-${day()}`, "expense", cat, Math.max(1000, Math.floor(total / cnt * 100 * uni(.7, 1.3))), pick(notes[cat])); }
    add(`${m}-${pad(int(15, 25))}`, "expense", "Bills", int(1400, 2400) * 100, "Electricity bill");
    if (rnd() < .7) add(`${m}-${day()}`, "expense", "Entertainment", int(500, 900) * 100, "Movie tickets");
    if (rnd() < .5) add(`${m}-${day()}`, "expense", "Health", int(300, 1500) * 100, pick(["Pharmacy", "Doctor visit"]));
    if (k % 2 === 0) add(`${m}-${day()}`, "expense", "Education", int(499, 1599) * 100, "Online course");
    if (k === 5 || k === 2) add(`${m}-${day()}`, "expense", "Travel", int(3500, 9000) * 100, k === 5 ? "Train tickets" : "Weekend trip");
    if (k % 2 === 1) add(`${m}-18`, "income", "Freelance", int(6000, 11000) * 100, "Side project");
    if (k % 3 === 0) add(`${m}-25`, "income", "Investments", 120000, "Dividend");
    if (k === 4) add(`${m}-09`, "income", "Gift", 200000, "Birthday gift");
  }
  add(today, "expense", "Food", 45000, "Swiggy dinner"); add(today, "expense", "Shopping", 1400000, "Phone accessories bundle");
  [["Food", 7000], ["Shopping", 4000], ["Entertainment", 3000], ["Transport", 2500], ["Bills", 4000], ["Health", 3000], ["Travel", 6000], ["Education", 1500]].forEach(([c, v]) => S.budgets[c] = v * 100);
  [["New laptop", 6000000, 1800000], ["Trip fund", 2500000, 2000000], ["Emergency fund", 10000000, 4200000], ["New phone", 4000000, 800000]].forEach(([name, target, saved]) => S.goals.push({ id: S.seq++, name, target, saved }));
  genRecurring(); save(); return { ok: true, count: S.tx.length };
}

/* router */
const R = [], route = (m, re, fn) => R.push([m, re, fn]);
route("GET", /^\/transactions$/, ({ q }) => {
  genRecurring(); let items = [...S.tx];
  if (q.get("month")) { const m = monthOk(q.get("month")); items = items.filter(t => t.date.startsWith(m)); }
  for (const col of ["type", "category"]) if (q.get(col)) items = items.filter(t => t[col] === q.get(col));
  const s = (q.get("q") || "").trim().toLowerCase(); if (s) items = items.filter(t => t.note.toLowerCase().includes(s) || t.category.toLowerCase().includes(s));
  const minAmt = parseFloat(q.get("min") || ""); if (!isNaN(minAmt)) items = items.filter(t => t.cents >= Math.round(minAmt * 100));
  const maxAmt = parseFloat(q.get("max") || ""); if (!isNaN(maxAmt)) items = items.filter(t => t.cents <= Math.round(maxAmt * 100));
  const sort = q.get("sort") || "date", dir = q.get("dir") === "asc" ? 1 : -1;
  if (sort === "amount") items.sort((a, b) => dir * (a.cents - b.cents) || b.id - a.id);
  else if (sort === "category") items.sort((a, b) => dir * a.category.localeCompare(b.category) || b.id - a.id);
  else items.sort((a, b) => (dir === 1 ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || b.id - a.id);
  const num = (k, d, lo, hi) => { const v = parseInt(q.get(k) ?? d, 10); if (isNaN(v)) throw new ApiError(`${k} must be a number`); return Math.max(lo, Math.min(hi, v)); };
  const lim = num("limit", 100, 1, 500), off = num("offset", 0, 0, 1e7);
  return { items: items.slice(off, off + lim).map(ser), total: items.length };
});
route("POST", /^\/transactions$/, ({ body }) => { const c = clean(body), t = newTx(c); save(); return { item: ser(t), alert: budgetAlert(t) }; });
route("PUT", /^\/transactions\/(\d+)$/, ({ body, m }) => {
  const t = getTx(m[1]), c = clean(body);
  if (t.rid != null && S.tx.some(x => x !== t && x.rid === t.rid && x.date.slice(0, 7) === c.date.slice(0, 7))) throw new ApiError("A recurring entry already exists in that month", 409);
  Object.assign(t, { type: c.type, category: c.category, date: c.date, cents: c.cents, note: c.note }); save(); return { item: ser(t) };
});
route("DELETE", /^\/transactions\/(\d+)$/, ({ m }) => { const t = getTx(m[1]); if (t.rid != null) S.skips.push(t.rid + "|" + t.date.slice(0, 7)); S.tx = S.tx.filter(x => x !== t); save(); return { ok: true }; });
route("POST", /^\/quick-add$/, ({ q, body }) => {
  const text = String((body || {}).text || "").trim().slice(0, 200), hist = [...S.tx].reverse().slice(0, 300).map(t => [t.note, t.category]); let p;
  try { p = A.parseQuick(text, new Date(), hist); } catch (e) { throw new ApiError(e.message); }
  const c = clean(p); if (q.get("preview")) return { parsed: p };
  const t = newTx(c); save(); return { item: ser(t), alert: budgetAlert(t) };
});
route("GET", /^\/budgets$/, () => ({ budgets: budgetsMap() }));
route("PUT", /^\/budgets$/, ({ body }) => {
  for (const [cat, v] of Object.entries(body || {})) { if (!A.EXPENSE.includes(cat)) throw new ApiError("Unknown category: " + String(cat).slice(0, 30)); if (v === null || v === "" || v === 0) delete S.budgets[cat]; else S.budgets[cat] = toCents(v); }
  save(); return { budgets: budgetsMap() };
});
route("GET", /^\/recurring$/, () => ({ items: recList() }));
route("POST", /^\/recurring$/, ({ body }) => {
  const d = Object.assign({ date: todayISO() }, body), c = clean(d), day = parseInt(d.day, 10);
  if (!(day >= 1 && day <= 28)) throw new ApiError("Day must be 1-28"); if (!c.note) throw new ApiError("Give the recurring item a name");
  S.recurring.push({ id: S.seq++, type: c.type, category: c.category, cents: c.cents, day, note: c.note, start_month: curMonth() }); genRecurring(); save(); return { items: recList() };
});
route("DELETE", /^\/recurring\/(\d+)$/, ({ m }) => {
  const id = +m[1]; if (!S.recurring.some(r => r.id === id)) throw new ApiError("Not found", 404);
  S.recurring = S.recurring.filter(r => r.id !== id); S.tx.forEach(t => { if (t.rid === id) t.rid = null; }); S.skips = S.skips.filter(k => !k.startsWith(id + "|")); save(); return { items: recList() };
});
route("GET", /^\/goals$/, () => ({ items: goalList() }));
route("POST", /^\/goals$/, ({ body }) => {
  const name = String((body || {}).name || "").trim().slice(0, 60); if (!name) throw new ApiError("Give the goal a name");
  S.goals.push({ id: S.seq++, name, target: toCents((body || {}).target), saved: 0 }); save(); return { items: goalList() };
});
route("POST", /^\/goals\/(\d+)\/deposit$/, ({ body, m }) => {
  const g = S.goals.find(x => x.id === +m[1]), c = toCents((body || {}).amount); if (!g) throw new ApiError("Not found", 404);
  g.saved += c; save(); const goal = goalList().find(x => x.id === g.id); return { goal, items: goalList(), reached: goal.saved >= goal.target };
});
route("POST", /^\/goals\/(\d+)\/withdraw$/, ({ body, m }) => {
  const g = S.goals.find(x => x.id === +m[1]), c = toCents((body || {}).amount); if (!g) throw new ApiError("Not found", 404);
  g.saved = Math.max(0, g.saved - c); save(); const goal = goalList().find(x => x.id === g.id); return { goal, items: goalList(), reached: goal.saved >= goal.target };
});
route("POST", /^\/transactions\/batch-delete$/, ({ body }) => {
  const ids = Array.isArray((body || {}).ids) ? (body || {}).ids.map(Number) : [];
  if (!ids.length) return { deleted: 0 };
  const before = S.tx.length;
  S.tx = S.tx.filter(x => !ids.includes(x.id));
  save();
  return { deleted: before - S.tx.length };
});
route("GET", /^\/backup$/, () => ({ version: 1, exported_at: todayISO(), data: JSON.parse(JSON.stringify(S)) }));
route("POST", /^\/restore$/, ({ body }) => {
  const d = (body || {}).data;
  if (!d || !Array.isArray(d.tx)) throw new ApiError("Invalid backup data format");
  S = {
    tx: d.tx || [],
    budgets: d.budgets || {},
    recurring: d.recurring || [],
    skips: d.skips || [],
    goals: d.goals || [],
    seq: Math.max(d.seq || 1, (d.tx || []).reduce((m, x) => Math.max(m, x.id || 0), 0) + 1)
  };
  save();
  return { ok: true, count: S.tx.length };
});
route("DELETE", /^\/goals\/(\d+)$/, ({ m }) => { if (!S.goals.some(x => x.id === +m[1])) throw new ApiError("Not found", 404); S.goals = S.goals.filter(x => x.id !== +m[1]); save(); return { items: goalList() }; });
route("GET", /^\/summary$/, ({ q }) => buildSummary(monthOk(q.get("month") || curMonth())));
route("GET", /^\/insights$/, ({ q }) => insights(monthOk(q.get("month") || curMonth())));
route("POST", /^\/import$/, ({ body }) => importCsv((body || {}).csv));
route("POST", /^\/demo$/, ({ body }) => demo(!!(body || {}).replace));
route("POST", /^\/reset$/, () => { S = blank(); save(); return { ok: true }; });

async function handle(method, path, body) {
  const u = new URL(path, "http://local"), q = u.searchParams;
  for (const [m, re, fn] of R) { const mt = m === method && re.exec(u.pathname); if (mt) return JSON.parse(JSON.stringify(fn({ q, body, m: mt }))); }
  throw new ApiError("Not found", 404);
}
root.SSLocal = { handle, exportCsv, ApiError };
if (typeof module !== "undefined" && module.exports) module.exports = root.SSLocal;
})(typeof window !== "undefined" ? window : globalThis);
