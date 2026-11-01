/* SmartSpend: accounts that live in the browser (localStorage).
   Passwords are salted and hashed with PBKDF2-SHA256 (Web Crypto). Each account has its own private data store. */
(function (root) {
"use strict";
const UK = "smartspend-users", FK = "smartspend-fails", AK = "smartspend-audit", SK = "ss-session";
const ls = () => { try { return root.localStorage; } catch (e) { return null; } }, ss = () => { try { return root.sessionStorage; } catch (e) { return null; } };
const read = (s, k, d) => { try { return JSON.parse(s.getItem(k)) || d; } catch (e) { return d; } };
const write = (s, k, v) => { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} };
const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$/;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hash(pw, salt) {
  const sub = root.crypto && root.crypto.subtle;
  if (!sub) throw new Error("Secure hashing is not available here. Open the page from a file or localhost.");
  const key = await sub.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(await sub.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256));
}
const users = () => read(ls(), UK, []), pub = u => u && { id: u.id, name: u.name, email: u.email, role: u.role };
function audit(action, detail = "", email = "") {
  const log = read(ls(), AK, []); log.unshift({ at: new Date().toISOString().replace("T", " ").slice(0, 19), email, action, detail }); write(ls(), AK, log.slice(0, 200));
}
const fail = msg => { const e = new Error(msg); e.userFacing = true; return e; };
async function register(name, email, pw) {
  name = String(name || "").trim(); email = String(email || "").trim().toLowerCase(); pw = String(pw || "");
  if (!(name.length >= 1 && name.length <= 60)) throw fail("Name must be 1-60 characters.");
  if (!EMAIL.test(email)) throw fail("Enter a valid e-mail address.");
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw fail("Password needs 8+ characters with letters and digits.");
  const all = users(); if (all.some(u => u.email === email)) throw fail("An account with this e-mail already exists.");
  const salt = root.crypto.getRandomValues(new Uint8Array(16)), u = { id: (all.reduce((m, x) => Math.max(m, x.id), 0)) + 1, name, email, salt: b64(salt), hash: await hash(pw, salt), role: all.length ? "user" : "admin", created: new Date().toISOString().slice(0, 10) };
  all.push(u); write(ls(), UK, all); write(ss(), SK, u.id); audit("register", "", email); return pub(u);
}
async function login(email, pw) {
  email = String(email || "").trim().toLowerCase(); const now = Date.now(), f = read(ls(), FK, {}); f[email] = (f[email] || []).filter(t => now - t < 300000);
  if (f[email].length >= 5) throw fail("Too many attempts. Try again in a few minutes.");
  const u = users().find(x => x.email === email);
  if (!u || (await hash(String(pw || ""), unb64(u.salt))) !== u.hash) { f[email].push(now); write(ls(), FK, f); throw fail("Invalid e-mail or password."); }
  delete f[email]; write(ls(), FK, f); write(ss(), SK, u.id); audit("login", "", email); return pub(u);
}
const currentId = () => { try { return read(ss(), SK, null); } catch (e) { return null; } };
const current = () => { const id = currentId(); return id ? pub(users().find(u => u.id === id)) || null : null; };
function logout() { const u = current(); u && audit("logout", "", u.email); try { ss().removeItem(SK); } catch (e) {} }
function adminInfo() {
  const me = current(); if (!me || me.role !== "admin") throw fail("Forbidden");
  const us = users().map(u => { const d = read(ls(), "smartspend-data-" + u.id, null); return { id: u.id, name: u.name, email: u.email, role: u.role, created: u.created, tx: d ? d.tx.length : 0 }; });
  return { users: us, tx: us.reduce((a, u) => a + u.tx, 0), log: read(ls(), AK, []).slice(0, 50) };
}
function deleteUser(id) {
  const me = current(); if (!me || me.role !== "admin") throw fail("Forbidden");
  id = +id; if (id === me.id) throw fail("You cannot delete your own account.");
  let all = users(); const target = all.find(u => u.id === id);
  if (!target) throw fail("User not found.");
  all = all.filter(u => u.id !== id);
  write(ls(), UK, all);
  try { ls().removeItem("smartspend-data-" + id); } catch (e) {}
  audit("delete_user", target.email, me.email);
  return { ok: true };
}
root.SSAuth = { register, login, logout, current, currentId, adminInfo, audit, deleteUser };
if (typeof module !== "undefined" && module.exports) module.exports = root.SSAuth;
})(typeof window !== "undefined" ? window : globalThis);
