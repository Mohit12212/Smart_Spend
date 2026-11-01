// Automated flow verification test: simulates all UI steps and data transactions
const assert = require("assert");
const path = require("path");

const mem = {}, sess = {};
globalThis.localStorage = {
  getItem: k => mem[k] ?? null,
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => delete mem[k]
};
globalThis.sessionStorage = {
  getItem: k => sess[k] ?? null,
  setItem: (k, v) => { sess[k] = String(v); },
  removeItem: k => delete sess[k]
};

const Auth = require(path.join(__dirname, "../js/auth.js"));
const Local = require(path.join(__dirname, "../js/localapi.js"));
const Analytics = require(path.join(__dirname, "../js/analytics.js"));

(async () => {
  console.log("Starting UI Flow & Integration Test Suite...");

  // 1. Register Admin User
  const u1 = await Auth.register("Deepak", "d@x.com", "Passw0rdX");
  assert.equal(u1.role, "admin");
  assert.equal(Auth.current().name, "Deepak");
  console.log("✓ Registration & session init passed");

  // 2. Demo data generation
  const demoResult = await Local.handle("POST", "/demo", {});
  assert.ok(demoResult.count > 20);
  console.log(`✓ Demo data populated (${demoResult.count} transactions)`);

  // 3. Summary & KPIs
  const today = new Date();
  const curM = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0");
  const s = await Local.handle("GET", `/summary?month=${curM}`);
  assert.ok(s.income > 0);
  assert.ok(s.expense > 0);
  assert.ok(s.score.score >= 0 && s.score.score <= 100);
  assert.ok(s.budgets.length >= 8);
  assert.ok(s.daily.length >= 28);
  console.log(`✓ Summary, Health Score (${s.score.score}/100) & Budgets verified`);

  // 4. Quick Add natural language
  const qaPreview = await Local.handle("POST", "/quick-add?preview=1", { text: "spent 250 on pizza yesterday" });
  assert.equal(qaPreview.parsed.category, "Food");
  assert.equal(qaPreview.parsed.amount, 250);

  const qaSave = await Local.handle("POST", "/quick-add", { text: "spent 250 on pizza yesterday" });
  assert.equal(qaSave.item.amount, 250);
  assert.equal(qaSave.item.category, "Food");
  console.log("✓ Quick-Add natural language parser & storage verified");

  // 5. Goals Deposit & Withdraw
  const goals = await Local.handle("GET", "/goals");
  assert.ok(goals.items.length >= 2);
  const g1 = goals.items[0];
  const dep = await Local.handle("POST", `/goals/${g1.id}/deposit`, { amount: 500 });
  assert.equal(dep.goal.saved, g1.saved + 500);
  const wdr = await Local.handle("POST", `/goals/${g1.id}/withdraw`, { amount: 200 });
  assert.equal(wdr.goal.saved, g1.saved + 300);
  console.log("✓ Goal deposit and withdraw verified");

  // 6. JSON Backup & Restore
  const backup = await Local.handle("GET", "/backup");
  assert.equal(backup.version, 1);
  assert.ok(Array.isArray(backup.data.tx));
  const txCountBefore = backup.data.tx.length;

  const restore = await Local.handle("POST", "/restore", { data: backup.data });
  assert.equal(restore.ok, true);
  assert.equal(restore.count, txCountBefore);
  console.log("✓ JSON backup and restore verified");

  // 7. Insights, 50/30/20, Anomalies, Subscriptions
  const ins = await Local.handle("GET", `/insights?month=${curM}`);
  assert.ok(ins.forecast !== undefined);
  assert.ok(Array.isArray(ins.anomalies));
  assert.ok(Array.isArray(ins.subscriptions));
  assert.ok(ins.rule503020 !== undefined);
  console.log("✓ Advanced analytics & 50/30/20 rule verified");

  // 8. Admin Information & Audit Logs
  const adminData = Auth.adminInfo();
  assert.equal(adminData.users.length, 1);
  assert.ok(adminData.log.length > 0);
  console.log("✓ Admin panel data & audit trails verified");

  // 9. Reset
  const resetRes = await Local.handle("POST", "/reset", {});
  assert.equal(resetRes.ok, true);
  const txAfterReset = await Local.handle("GET", "/transactions");
  assert.equal(txAfterReset.total, 0);
  console.log("✓ Full data wipe and reset verified");

  console.log("\nALL UI FLOW TESTS COMPLETED SUCCESSFULLY (9/9)!");
})();
