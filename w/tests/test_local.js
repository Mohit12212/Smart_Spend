// Tests for the JavaScript engine (static/analytics.js + static/localapi.js). Run: node tests/test_local.js
const assert = require("assert"); const path = require("path");
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => delete mem[k] };
const A = require(path.join(__dirname, "../js/analytics.js")); const L = require(path.join(__dirname, "../js/localapi.js"));
const pad = n => String(n).padStart(2, "0"), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = new Date(), T = iso(TODAY), M = T.slice(0, 7), yest = iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 1));
const api = (m, p, b) => L.handle(m, p, b), tx = (amount = 100, category = "Food", type = "expense", date = T, note = "") => api("POST", "/transactions", { type, amount, category, date, note });
const fails = async (p, re) => { try { await p; } catch (e) { assert.match(e.message, re || /./); return e; } assert.fail("expected an error"); };
const tests = [];
const test = (n, f) => tests.push([n, f]);

test("create, edit, delete a transaction", async () => {
  const r = await tx(450.5, "Food", "expense", T, "Lunch"); assert.equal(r.item.amount, 450.5);
  const e = await api("PUT", `/transactions/${r.item.id}`, { type: "expense", amount: 500, category: "Transport", date: M + "-01", note: "Cab" }); assert.equal(e.item.category, "Transport");
  await api("DELETE", `/transactions/${r.item.id}`); assert.equal((await api("GET", "/transactions")).total, 0);
});
test("validation rejects bad input", async () => {
  for (const b of [{ type: "expense", amount: 0, category: "Food", date: T }, { type: "expense", amount: -5, category: "Food", date: T }, { type: "expense", amount: "abc", category: "Food", date: T },
    { type: "expense", amount: 5, category: "Nope", date: T }, { type: "income", amount: 5, category: "Food", date: T }, { type: "loan", amount: 5, category: "Food", date: T },
    { type: "expense", amount: 5, category: "Food", date: "31/10/2026" }, { type: "expense", amount: 5, category: "Food", date: "2026-02-31" }]) await fails(api("POST", "/transactions", b));
});
test("money is exact (0.1 x 3 = 0.3)", async () => { for (let i = 0; i < 3; i++) await tx(0.1); assert.equal((await api("GET", `/summary?month=${M}`)).expense, 0.3); });
test("search is literal and safe", async () => {
  await tx(10, "Food", "expense", T, "100% cotton"); await tx(10, "Food", "expense", T, "plain");
  assert.equal((await api("GET", "/transactions?q=%25")).total, 1);
  for (const q of ["' OR 1=1 --", "'; DROP TABLE x; --"]) assert.equal((await api("GET", "/transactions?q=" + encodeURIComponent(q))).total, 0);
  assert.equal((await api("GET", "/transactions")).total, 2); await fails(api("GET", "/transactions?month=2026-1; DROP"), /Month/);
});
test("budget alerts cross 80% then 100%", async () => {
  await api("PUT", "/budgets", { Food: 1000 }); assert.equal((await tx(850)).alert.level, "warn"); assert.equal((await tx(200)).alert.level, "danger"); assert.equal((await tx(10)).alert, null);
  assert.equal((await api("GET", `/summary?month=${M}`)).alerts[0].level, "danger"); await fails(api("PUT", "/budgets", { Salary: 5 }), /Unknown/);
});
test("quick-add parses, previews and saves", async () => {
  const p = (await api("POST", "/quick-add?preview=1", { text: "spent 250 on pizza yesterday" })).parsed; assert.deepEqual([p.amount, p.category, p.date], [250, "Food", yest]);
  assert.equal((await api("GET", "/transactions")).total, 0); assert.equal((await api("POST", "/quick-add", { text: "got salary 55k" })).item.amount, 55000); await fails(api("POST", "/quick-add", { text: "hello world" }), /No amount/);
});
test("recurring creates once and respects delete", async () => {
  await api("POST", "/recurring", { type: "expense", amount: 15000, category: "Rent", day: 1, note: "Rent" });
  for (let i = 0; i < 3; i++) await api("GET", "/transactions");
  const items = (await api("GET", `/transactions?month=${M}`)).items; assert.equal(items.length, 1); assert.ok(items[0].recurring);
  await api("DELETE", `/transactions/${items[0].id}`); assert.equal((await api("GET", `/transactions?month=${M}`)).total, 0);
});
test("goals deposit and completion", async () => {
  await api("POST", "/goals", { name: "Laptop", target: 10000 }); const id = (await api("GET", "/goals")).items[0].id;
  assert.equal((await api("POST", `/goals/${id}/deposit`, { amount: 4000 })).reached, false); assert.equal((await api("POST", `/goals/${id}/deposit`, { amount: 6000 })).reached, true); await fails(api("POST", `/goals/${id}/deposit`, { amount: -5 }));
});
test("CSV export, safe formulas, duplicate-safe import", async () => {
  await tx(300, "Food", "expense", T, '=HYPERLINK("x")'); await tx(50, "Health", "expense", T, "a, b");
  const csv = L.exportCsv(); assert.ok(csv.includes("'=HYPERLINK") && csv.includes('"a, b"'));
  let r = await api("POST", "/import", { csv }); assert.deepEqual([r.imported, r.duplicates], [0, 2]);
  r = await api("POST", "/import", { csv: "Date,Type,Category,Amount,Note\n2026-01-05,expense,Food,120,Tea\n2026-01-06,expense,Food,abc,Bad\nnot-a-date,income,Salary,5,x\n" }); assert.deepEqual([r.imported, r.skipped], [1, 2]);
  await fails(api("POST", "/import", { csv: "foo,bar\n1,2" }), /columns/);
});
test("summary totals and health score = 90", async () => {
  await tx(50000, "Salary", "income"); await tx(12000); const s = await api("GET", `/summary?month=${M}`);
  assert.deepEqual([s.income, s.expense, s.net, s.rate, s.score.score], [50000, 12000, 38000, 76, 90]);
});
test("demo data, 409 guard, insights", async () => {
  await api("POST", "/demo", {}); await fails(api("POST", "/demo", {}), /already have data/); await api("POST", "/demo", { replace: true });
  const i = await api("GET", `/insights?month=${M}`); assert.ok(i.forecast && i.forecast.next > 0);
  assert.ok(i.anomalies.some(a => a.note.includes("Phone accessories"))); const names = i.subscriptions.map(s => s.name); assert.ok(names.includes("Netflix Subscription") && names.includes("Spotify Premium")); assert.ok(Object.keys(i.recommendations.budgets).length);
  const s = await api("GET", `/summary?month=${M}`); assert.ok(s.income > 0 && s.alerts.length >= 1);
});
test("reset wipes everything", async () => {
  await api("POST", "/demo", {}); await api("POST", "/reset", {});
  const s = await api("GET", `/summary?month=${M}`); assert.deepEqual([(await api("GET", "/transactions")).total, s.budgets.length, s.goals.length, (await api("GET", "/recurring")).items.length], [0, 0, 0, 0]);
});
test("data persists in storage", async () => { await tx(77); assert.ok(JSON.parse(mem["smartspend-data-guest"]).tx.length === 1); });
test("unknown route is 404", async () => { await fails(api("GET", "/nope"), /Not found/); });
test("parity: parseQuick variants ", () => {
  const t = new Date(2026, 9, 31);
  let p = A.parseQuick("uber 180 3 days ago", t); assert.deepEqual([p.amount, p.category, p.date], [180, "Transport", "2026-10-28"]);
  p = A.parseQuick("paid ₹1,250.50 for wifi bill 12/10", t); assert.deepEqual([p.amount, p.category, p.date], [1250.5, "Bills", "2026-10-12"]);
  p = A.parseQuick("freelance project 2k", t); assert.deepEqual([p.type, p.category, p.amount], ["income", "Freelance", 2000]);
  assert.equal(A.parseQuick("coffee 90 day before yesterday", t).date, "2026-10-29"); assert.throws(() => A.parseQuick("nothing here"), /No amount/);
  assert.equal(A.categorize("zumba class", false, [["zumba class", "Health"], ["zumba class", "Health"]]), "Health");
});
test("parity: forecast, anomalies, subscriptions", () => {
  assert.equal(A.forecast([100]), null); const f = A.forecast([1000, 2000, 3000]); assert.deepEqual([f.next, f.trend], [3150, "rising"]); assert.equal(A.forecast([1000, 3000]).next, 2200); assert.equal(A.forecast([500, 500, 500]).trend, "stable");
  const ex = [400, 450, 500, 420, 480].map((a, i) => ({ id: i, date: `2026-09-1${i}`, category: "Food", amount: a, note: "" })); ex.push({ id: 9, date: "2026-10-05", category: "Food", amount: 6000, note: "Party" });
  const r = A.anomalies(ex, "2026-10"); assert.deepEqual([r.length, r[0].id], [1, 9]); assert.deepEqual(A.anomalies([...ex.slice(0, 3), ex[5]], "2026-10"), []);
  const s = A.subscriptions([7, 8, 9].map(m => ({ date: `2026-0${m}-12`, amount: 649, note: "Netflix subscription" })).concat([{ date: "2026-09-03", amount: 500, note: "Lunch" }])); assert.deepEqual([s.length, s[0].yearly], [1, 7788]);
});

(async () => {
  let pass = 0;
  for (const [name, fn] of tests) {
    try { await api("POST", "/reset", {}); await fn(); pass++; console.log("PASS", name); } catch (e) { console.log("FAIL", name, "->", e.message); }
  }
  console.log(`\n${pass}/${tests.length} passed`); process.exit(pass === tests.length ? 0 : 1);
})();
