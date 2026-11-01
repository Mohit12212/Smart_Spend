/* SmartSpend: analytics engine in JavaScript .
   Works in the browser (window.SS) and in Node (module.exports) for testing. */
(function (root) {
"use strict";
const EXPENSE = ["Food", "Rent", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Education", "Travel", "Other"];
const INCOME = ["Salary", "Freelance", "Investments", "Gift", "Other income"];
const DISCRETIONARY = new Set(["Food", "Shopping", "Entertainment", "Travel"]);
const NEEDS = new Set(["Rent", "Bills", "Transport", "Health", "Education"]);
const w = s => s.split(" ");
const EXPENSE_KW = {
  Food: w("pizza burger lunch dinner breakfast coffee tea swiggy zomato restaurant cafe grocery groceries milk snacks food biryani maggi"),
  Rent: w("rent landlord hostel pg"), Transport: w("uber ola rapido bus metro train auto fuel petrol diesel cab taxi"),
  Shopping: w("amazon flipkart myntra shoes clothes shirt jeans shopping mall"),
  Bills: w("electricity wifi internet recharge mobile water gas bill broadband jio airtel"),
  Entertainment: w("netflix spotify movie cinema game gaming prime hotstar concert"),
  Health: w("doctor medicine pharmacy hospital gym medical dentist"), Education: w("book books course tuition fees udemy exam college stationery"),
  Travel: w("flight hotel trip ticket booking irctc"),
};
const INCOME_KW = { Salary: w("salary stipend paycheck wages"), Freelance: w("freelance project client gig"), Investments: w("dividend interest stocks mutual"), Gift: w("gift present") };
const INCOME_WORDS = new Set(w("salary received earned income stipend bonus credited dividend payout freelance paycheck wages"));
const FILLER = new Set(w("spent paid pay on for rs inr received got earned from at of a the my to bought buy"));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
const tokens = t => t.toLowerCase().match(/[a-z]+/g) || [];
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length, h = n >> 1; return n % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

function categorize(text, income = false, history = null) {
  const table = income ? INCOME_KW : EXPENSE_KW, toks = tokens(text), score = {};
  for (const [c, words] of Object.entries(table)) score[c] = 2 * toks.filter(t => words.includes(t)).length;
  if (history && history.length) {
    const votes = {};
    for (const [note, cat] of history) for (const t of new Set(tokens(note))) { votes[t] = votes[t] || {}; votes[t][cat] = (votes[t][cat] || 0) + 1; }
    for (const t of new Set(toks)) for (const [c, n] of Object.entries(votes[t] || {})) if (c in table) score[c] += 0.5 * n;
  }
  let best = null, bs = 0;
  for (const [c, v] of Object.entries(score)) if (v > bs) { best = c; bs = v; }
  return best || (income ? "Other income" : "Other");
}

function parseQuick(text, today = new Date(), history = null) {
  const T = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let s = " " + String(text).trim().toLowerCase() + " ", when = T, m;
  const mk = (y, mo, d) => { const x = new Date(y, mo - 1, d); if (x.getFullYear() !== y || x.getMonth() !== mo - 1 || x.getDate() !== d) throw new Error("That date does not exist"); return x; };
  const minus = n => new Date(T.getFullYear(), T.getMonth(), T.getDate() - n);
  const rm = str => { s = s.split(str).join(" "); };
  if ((m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) { when = mk(+m[1], +m[2], +m[3]); rm(m[0]); }
  else if (s.includes("day before yesterday")) { when = minus(2); rm("day before yesterday"); }
  else if (s.includes("yesterday")) { when = minus(1); rm("yesterday"); }
  else if (s.includes("today")) rm("today");
  else if ((m = s.match(/\b(\d+)\s+days?\s+ago\b/))) { when = minus(+m[1]); rm(m[0]); }
  else if ((m = s.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/))) { let y = m[3] ? +m[3] : T.getFullYear(); if (y < 100) y += 2000; when = mk(y, +m[2], +m[1]); rm(m[0]); }
  m = s.match(/(?<![\w.])(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|lac)?(?![a-z0-9])/);
  if (!m) throw new Error("No amount found. Try: spent 250 on pizza yesterday");
  const amount = parseFloat(m[1].replace(/,/g, "")) * ({ k: 1000, lakh: 100000, lac: 100000 }[m[2]] || 1);
  s = s.replace(m[0], " ");
  const income = tokens(text).some(t => INCOME_WORDS.has(t));
  const words = (s.match(/[a-z][a-z&'\-]*/g) || []).filter(x => !FILLER.has(x));
  let note = words.join(" "); note = note ? note[0].toUpperCase() + note.slice(1) : (income ? "Income" : "Expense");
  return { type: income ? "income" : "expense", amount, date: iso(when), category: categorize(text, income, history), note };
}

function forecast(totals) {
  const n = totals.length; if (n < 2) return null;
  const wts = n === 2 ? [.4, .6] : [.2, .3, .5], last = totals.slice(-wts.length);
  const wavg = wts.reduce((a, x, i) => a + x * last[i], 0);
  let pred, slope, rmse, method;
  if (n >= 3) {
    const y = totals.slice(-6), k = y.length, mx = (k - 1) / 2, my = y.reduce((a, b) => a + b, 0) / k;
    const den = y.reduce((a, _, x) => a + (x - mx) ** 2, 0); slope = y.reduce((a, v, x) => a + (x - mx) * (v - my), 0) / den;
    pred = .5 * wavg + .5 * (my + slope * (k - mx));
    rmse = Math.sqrt(y.reduce((a, v, x) => a + (v - (my + slope * (x - mx))) ** 2, 0) / k); method = "weighted average + linear trend";
  } else { slope = totals[1] - totals[0]; pred = wavg; rmse = Math.abs(slope) / 2; method = "weighted average"; }
  pred = Math.max(0, pred); const avg = totals.reduce((a, b) => a + b, 0) / n, pct = avg ? slope / avg : 0;
  return { next: r2(pred), low: r2(Math.max(0, pred - rmse)), high: r2(pred + rmse), trend: pct > .03 ? "rising" : pct < -.03 ? "falling" : "stable", method, months_used: n };
}

function anomalies(expenses, month) {
  const by = {}; for (const e of expenses) (by[e.category] = by[e.category] || []).push(e.amount);
  const out = [];
  for (const e of expenses) {
    if (!e.date.startsWith(month)) continue;
    const vals = by[e.category]; if (vals.length < 5) continue;
    const med = median(vals), mad = median(vals.map(v => Math.abs(v - med)));
    const z = mad ? 0.6745 * (e.amount - med) / mad : (e.amount > 3 * med ? 99 : 0);
    if (z > 3.5 && e.amount > 1.5 * med) out.push(Object.assign({}, e, { typical: r2(med), ratio: r1(e.amount / med) }));
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

function subscriptions(expenses) {
  const g = new Map();
  for (const e of expenses) {
    const name = e.note.toLowerCase().replace(/\(recurring\)|[\d\W_]+/g, " ").trim(); if (!name || e.category === "Rent") continue;
    const key = name + "|" + Math.round(e.amount); if (!g.has(key)) g.set(key, new Set()); g.get(key).add(e.date.slice(0, 7));
  }
  const subs = [];
  for (const [key, ms] of g) if (ms.size >= 3) { const [n, a] = key.split("|"); subs.push({ name: n.replace(/\b\w/g, c => c.toUpperCase()), monthly: +a, yearly: +a * 12, months: ms.size }); }
  return subs.sort((a, b) => b.monthly - a.monthly);
}

function healthScore(income, expense, budgetOk, goalRatio) {
  if (!(income || expense)) return { score: 0, savings: 0, budgets: 0, goals: 0, label: "No data yet" };
  const rate = income ? (income - expense) / income : 0;
  const p = { savings: Math.round(Math.min(1, Math.max(0, rate) / .3) * 50), budgets: Math.round(budgetOk * 30), goals: Math.round(goalRatio * 20) };
  const score = Math.max(0, Math.min(100, p.savings + p.budgets + p.goals));
  return Object.assign({ score }, p, { label: score >= 75 ? "Excellent" : score >= 50 ? "Decent" : "Needs attention" });
}

function recommendations(avg, income) {
  const budgets = {}; let total = 0;
  for (const [c, v] of Object.entries(avg)) { total += v; if (v > 0) budgets[c] = Math.round(v * (DISCRETIONARY.has(c) ? .9 : 1.05) / 100) * 100; }
  const tips = [];
  if (income) {
    const sumOf = set => Object.entries(avg).filter(([c]) => set.has(c)).reduce((a, [, v]) => a + v, 0);
    const needs = sumOf(NEEDS) / income * 100, wants = sumOf(DISCRETIONARY) / income * 100, save = (income - total) / income * 100;
    if (needs > 50) tips.push(`Needs take ${needs.toFixed(0)}% of income (guideline 50%). Review rent, bills and transport.`);
    if (wants > 30) tips.push(`Wants take ${wants.toFixed(0)}% of income (guideline 30%). Trim food-out, shopping or entertainment.`);
    tips.push(`Savings rate is ${save.toFixed(0)}%. ` + (save >= 20 ? "Great, keep going and fund a goal." : "Aim for 20% or more."));
  }
  return { budgets, tips };
}

function rule503020(avg, income) {
  const needsSum = Object.entries(avg).filter(([c]) => NEEDS.has(c)).reduce((a, [, v]) => a + v, 0);
  const wantsSum = Object.entries(avg).filter(([c]) => DISCRETIONARY.has(c)).reduce((a, [, v]) => a + v, 0);
  const otherSum = Object.entries(avg).filter(([c]) => !NEEDS.has(c) && !DISCRETIONARY.has(c)).reduce((a, [, v]) => a + v, 0);
  const totalExpense = needsSum + wantsSum + otherSum;
  const inc = income > 0 ? income : totalExpense;
  const savings = Math.max(0, (income || 0) - totalExpense);
  return {
    needs: { amount: r2(needsSum), pct: inc ? Math.round(needsSum / inc * 100) : 0, targetPct: 50 },
    wants: { amount: r2(wantsSum), pct: inc ? Math.round(wantsSum / inc * 100) : 0, targetPct: 30 },
    savings: { amount: r2(savings), pct: inc ? Math.round(savings / inc * 100) : 0, targetPct: 20 },
    totalExpense: r2(totalExpense),
    income: r2(income || 0)
  };
}

const CATEGORY_ICONS = {
  Food: "🍔", Rent: "🏠", Transport: "🚗", Shopping: "🛍️", Bills: "💡",
  Entertainment: "🎬", Health: "🏥", Education: "📚", Travel: "✈️", Other: "📦",
  Salary: "💼", Freelance: "💻", Investments: "📈", Gift: "🎁", "Other income": "💵"
};

const SS = { EXPENSE, INCOME, DISCRETIONARY, NEEDS, CATEGORY_ICONS, categorize, parseQuick, forecast, anomalies, subscriptions, healthScore, recommendations, rule503020 };
root.SS = SS; if (typeof module !== "undefined" && module.exports) module.exports = SS;
})(typeof window !== "undefined" ? window : globalThis);
