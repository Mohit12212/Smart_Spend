// Browser-level check using jsdom. Start a static server first:  npx serve -l 8002  (any static file server works)
// then:  npm i jsdom  &&  node tests/smoke_browser.js
const { JSDOM, VirtualConsole } = require("jsdom"); const { webcrypto } = require("crypto");
const BASE = process.env.BASE || "http://127.0.0.1:8002", sleep = ms => new Promise(r => setTimeout(r, ms)), out = [];
const ok = (n, c, x = "") => out.push([c ? "OK  " : "FAIL", n, x]);
const errs = []; const vc = new VirtualConsole(); vc.on("jsdomError", e => errs.push(e.message)); vc.on("error", e => errs.push(String(e)));
const open = (page, before) => JSDOM.fromURL(`${BASE}/${page}`, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.matchMedia = () => ({ matches: false }); w.confirm = () => true; Object.defineProperty(w, "crypto", { value: webcrypto, configurable: true }); w.TextEncoder = TextEncoder; before && before(w); } });
(async () => {
  // ---------- login page ----------
  let dom = await open("login.html"), w = dom.window, d = w.document, $ = s => d.querySelector(s);
  await sleep(600);
  ok("login page shows only the sign-in form", !$("#f-login").hidden && $("#f-register").hidden);
  d.querySelector('[data-t="register"]').click(); ok("tab switches to create-account form only", $("#f-login").hidden && !$("#f-register").hidden);
  const f = $("#f-register"); const fld = n => f.querySelector(`[name=${n}]`); fld("name").value = "Deepak"; fld("email").value = "d@x.com"; fld("password").value = "abc";
  f.dispatchEvent(new w.Event("submit", { cancelable: true })); await sleep(500);
  ok("weak password shows an error", !$("#err").hidden && /8\+/.test($("#err").textContent), $("#err").textContent);
  fld("password").value = "Passw0rdX"; f.dispatchEvent(new w.Event("submit", { cancelable: true })); await sleep(2500);
  const users = JSON.parse(w.localStorage.getItem("smartspend-users") || "[]");
  ok("registration stores a hashed account and starts a session", users.length === 1 && users[0].role === "admin" && !JSON.stringify(users).includes("Passw0rdX") && w.sessionStorage.getItem("ss-session") === "1", `users: ${users.length}, role: ${users[0] && users[0].role}`);
  const saved = JSON.stringify(users), savedLog = w.localStorage.getItem("smartspend-audit") || "[]"; w.close();

  // ---------- app (signed in) ----------
  dom = await open("index.html", w2 => { w2.localStorage.setItem("smartspend-users", saved); w2.localStorage.setItem("smartspend-audit", savedLog); w2.sessionStorage.setItem("ss-session", "1"); });
  w = dom.window; d = w.document; $ = s => d.querySelector(s); await sleep(1500);
  ok("app opens signed-in with the user's name", /Deepak/.test($("#who").textContent) && d.querySelectorAll("#view .kc").length === 4, $("#who").textContent);
  ok("admin tab visible for the first account", /Admin/.test($("#nav").textContent));
  ok("no 'Pro' and no server calls in the page", !/\bPro\b/.test(d.body.textContent) && !/\/api\//.test([...d.scripts].map(s => s.src).join()));
  $("#demo").click(); await sleep(2200);
  ok("Demo button fills the app", d.querySelectorAll("#heat i").length >= 28 && /Demo data loaded/.test($("#toast").textContent), $("#toast").textContent);
  const checks = { tx: v => v.querySelectorAll("tbody tr").length >= 2, bud: v => v.querySelectorAll(".bar i").length === 10, goal: v => v.querySelectorAll(".grid .card").length >= 2, rec: v => v.querySelectorAll("tbody tr").length >= 2,
    ins: v => /Forecast/.test(v.textContent) && /Netflix/i.test(v.textContent) && /Phone accessories/.test(v.textContent) && /saves/.test(v.textContent), rep: v => !!$("#r-print"), admin: v => /Administration/.test(v.textContent) && /d@x\.com/.test(v.textContent) && /register/.test(v.textContent) };
  for (const t of Object.keys(checks)) { const b = $(`#nav [data-k="${t}"]`); if (!b) { ok(`tab "${t}" exists`, false); continue; } b.click(); await sleep(1300); ok(`tab "${t}" works`, checks[t]($("#view"))); }
  ok("quick-add bar is hidden on other tabs", $(".qa").hidden === true);
  $('#nav [data-k="dash"]').click(); await sleep(600); ok("quick-add bar shows on the dashboard", $(".qa").hidden === false);
  $("#qa").value = "spent 250 on pizza yesterday"; $("#qa").dispatchEvent(new w.Event("input")); await sleep(500);
  ok("quick-add live preview", /Food/.test($("#qp").textContent), $("#qp").textContent);
  $("#qa").dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter" })); await sleep(800); ok("quick-add saves", /Added/.test($("#toast").textContent));
  $("#add").click(); $("#m-amt").value = "99"; $("#m-note").value = "<img src=x onerror=alert(1)>"; $("#m-save").click(); await sleep(800);
  $('#nav [data-k="tx"]').click(); await sleep(800); ok("script in a note is shown as text", d.querySelectorAll("#view img").length === 0 && /<img src=x/.test($("#view").textContent));
  ok("data saved under this user", JSON.parse(w.localStorage.getItem("smartspend-data-1")).tx.length > 20);
  $("#reset").click(); await sleep(1000); const after = JSON.parse(w.localStorage.getItem("smartspend-data-1"));
  ok("Reset button wipes everything", after.tx.length === 0 && !Object.keys(after.budgets).length && !after.goals.length && /cleared/.test($("#toast").textContent));
  $("#logout").click(); ok("Log out ends the session", w.sessionStorage.getItem("ss-session") === null);
  w.close();
  out.forEach(r => console.log(...r)); const bad = errs.filter(e => !/canvas|Not implemented|Failed to create chart|navigation/i.test(e)); console.log("Unexpected JS errors:", bad.length ? bad : "none");
  process.exit(out.some(r => r[0] === "FAIL") ? 1 : 0);
})().catch(e => { console.error("CRASH", e); process.exit(1); });
