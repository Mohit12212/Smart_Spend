// Tests for browser-side accounts (js/auth.js). Run: node tests/test_auth.js
const assert = require("assert"), path = require("path");
const mk = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m }; };
globalThis.localStorage = mk(); globalThis.sessionStorage = mk();
const Auth = require(path.join(__dirname, "../js/auth.js"));
const fresh = () => { globalThis.localStorage = mk(); globalThis.sessionStorage = mk(); };
const rej = async (p, re) => { try { await p; } catch (e) { assert.match(e.message, re); assert.ok(e.userFacing); return; } assert.fail("expected rejection"); };
const tests = [];
const test = (n, f) => tests.push([n, f]);

test("weak password and bad input rejected", async () => {
  await rej(Auth.register("A", "a@x.com", "abc"), /8\+ characters/); await rej(Auth.register("A", "a@x.com", "abcdefgh"), /letters and digits/);
  await rej(Auth.register("A", "not-an-email", "Passw0rdX"), /valid e-mail/); await rej(Auth.register("", "a@x.com", "Passw0rdX"), /Name/);
  assert.equal(Auth.current(), null);
});
test("register logs in; first user is admin; password never stored in plain text", async () => {
  const u = await Auth.register("Alice", "A@X.com", "Passw0rdX"); assert.deepEqual([u.role, u.email], ["admin", "a@x.com"]); assert.equal(Auth.current().name, "Alice");
  const raw = localStorage.getItem("smartspend-users"); assert.ok(!raw.includes("Passw0rdX")); assert.ok(JSON.parse(raw)[0].hash.length > 20);
});
test("same password gets different hashes (salted)", async () => {
  await Auth.register("A", "a@x.com", "Passw0rdX"); await Auth.register("B", "b@x.com", "Passw0rdX"); const us = JSON.parse(localStorage.getItem("smartspend-users"));
  assert.notEqual(us[0].hash, us[1].hash); assert.notEqual(us[0].salt, us[1].salt); assert.equal(us[1].role, "user");
});
test("duplicate e-mail is rejected (case-insensitive)", async () => { await Auth.register("A", "a@x.com", "Passw0rdX"); await rej(Auth.register("A2", "A@X.COM", "Passw0rdX"), /already exists/); });
test("login success, wrong password, logout", async () => {
  await Auth.register("A", "a@x.com", "Passw0rdX"); Auth.logout(); assert.equal(Auth.current(), null);
  await rej(Auth.login("a@x.com", "wrong"), /Invalid e-mail or password/); await rej(Auth.login("nobody@x.com", "Passw0rdX"), /Invalid/);
  const u = await Auth.login("A@x.com", "Passw0rdX"); assert.equal(u.name, "A"); assert.equal(Auth.current().email, "a@x.com"); Auth.logout(); assert.equal(Auth.currentId(), null);
});
test("lock-out after 5 failures, even with the right password", async () => {
  await Auth.register("A", "a@x.com", "Passw0rdX"); Auth.logout();
  for (let i = 0; i < 5; i++) await rej(Auth.login("a@x.com", "nope"), /Invalid/);
  await rej(Auth.login("a@x.com", "Passw0rdX"), /Too many attempts/);
});
test("admin page data: admin allowed, normal user forbidden", async () => {
  await Auth.register("A", "a@x.com", "Passw0rdX"); const info = Auth.adminInfo(); assert.equal(info.users.length, 1); assert.ok(info.log.some(l => l.action === "register"));
  await Auth.register("B", "b@x.com", "Passw0rdX"); assert.throws(() => Auth.adminInfo(), /Forbidden/);
});
test("each account has its own private data", async () => {
  const lp = path.join(__dirname, "../js/localapi.js"), an = path.join(__dirname, "../js/analytics.js");
  const load = () => { delete require.cache[require.resolve(lp)]; require(an); return require(lp); };
  const T = new Date(), d = `${T.getFullYear()}-${String(T.getMonth() + 1).padStart(2, "0")}-${String(T.getDate()).padStart(2, "0")}`;
  await Auth.register("A", "a@x.com", "Passw0rdX"); let L = load(); await L.handle("POST", "/transactions", { type: "expense", amount: 100, category: "Food", date: d, note: "A's lunch" });
  assert.equal((await L.handle("GET", "/transactions")).total, 1);
  Auth.logout(); await Auth.register("B", "b@x.com", "Passw0rdX"); L = load(); assert.equal((await L.handle("GET", "/transactions")).total, 0);
  Auth.logout(); await Auth.login("a@x.com", "Passw0rdX"); L = load(); assert.equal((await L.handle("GET", "/transactions")).items[0].note, "A's lunch");
});

(async () => {
  let pass = 0;
  for (const [n, f] of tests) { fresh(); try { await f(); pass++; console.log("PASS", n); } catch (e) { console.log("FAIL", n, "->", e.message); } }
  console.log(`\n${pass}/${tests.length} passed`); process.exit(pass === tests.length ? 0 : 1);
})();
