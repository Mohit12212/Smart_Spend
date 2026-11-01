(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const show = t => {
    $('#f-login').hidden = t !== 'login';
    $('#f-register').hidden = t !== 'register';
    $('#err').hidden = true;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  };
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => show(b.dataset.t));
  show('login');

  if (SSAuth.current()) location.replace('index.html');

  // Password visibility toggle
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.onclick = () => {
      const inp = $('#' + btn.dataset.target);
      if (!inp) return;
      const isPw = inp.type === 'password';
      inp.type = isPw ? 'text' : 'password';
      btn.textContent = isPw ? '🙈' : '👁️';
    };
  });

  // Password strength meter
  const pw = $('#pw');
  if (pw) {
    pw.oninput = () => {
      const v = pw.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++;
      if (v.length >= 12) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      $('#meter').style.width = s * 25 + '%';
      $('#meter').style.background = ['#e11d48', '#e11d48', '#d97706', '#10b981', '#10b981'][s];
      $('#mtxt').textContent = ['Too weak', 'Weak (add numbers/symbols)', 'Fair (good length)', 'Good', 'Strong & Secure'][s];
    };
  }

  async function submit(e, fn) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    $('#err').hidden = true;
    try {
      await fn(new FormData(e.target));
      location.href = 'index.html';
    } catch (err) {
      $('#err').textContent = err.userFacing ? err.message : 'Something went wrong: ' + err.message;
      $('#err').hidden = false;
      btn.disabled = false;
    }
  }

  $('#f-login').onsubmit = e => submit(e, f => SSAuth.login(f.get('email'), f.get('password')));
  $('#f-register').onsubmit = e => submit(e, f => SSAuth.register(f.get('name'), f.get('email'), f.get('password')));

  // Quick 1-click test / demo login
  const qBtn = $('#b-quick-demo');
  if (qBtn) {
    qBtn.onclick = async () => {
      qBtn.disabled = true;
      qBtn.textContent = 'Logging in...';
      try {
        let loggedIn = false;
        try {
          await SSAuth.login('demo@smartspend.app', 'DemoPass123');
          loggedIn = true;
        } catch (e) {
          // If user doesn't exist, register
          await SSAuth.register('Demo User', 'demo@smartspend.app', 'DemoPass123');
          loggedIn = true;
        }
        if (loggedIn) location.href = 'index.html';
      } catch (err) {
        $('#err').textContent = err.message || 'Demo login failed';
        $('#err').hidden = false;
        qBtn.disabled = false;
        qBtn.textContent = '⚡ 1-Click Instant Demo Login';
      }
    };
  }
})();