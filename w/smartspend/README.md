# SmartSpend: Smart Expense Tracker & Personal Finance Dashboard

A production-grade, local-first **HTML5 + CSS3 + Vanilla JavaScript** web application. Zero backend setup, zero cloud dependency, zero external API latency, no build step required. Everything executes securely right inside the browser with `localStorage` and WebCrypto PBKDF2 encryption.

---

## 🚀 Instant Launch

1. Double-click **`index.html`** or **`login.html`** to launch directly in any modern browser (Chrome, Edge, Firefox, Safari).
2. On the login screen:
   - Click **⚡ 1-Click Instant Demo Login** for immediate access, or
   - Click **Create account** to register (the first account automatically receives Administrator privileges).
3. Click **✨ Demo data** in the header to populate 8 months of realistic financial transactions, envelope budgets, goals, and recurring rules.
4. Click **🗑 Reset** anytime to wipe all account data.

---

## 🌟 Key Features

| Area | Features & Capabilities |
|---|---|
| **Natural Language Quick-Add** | Type phrases like `spent 250 on pizza yesterday`, `uber 180 3 days ago`, `got salary 55k`: amount, transaction type, category, and date are automatically inferred. Learns category associations from past notes with real-time live preview as you type. Plus 1-click suggestion chips! |
| **Multi-Currency Engine** | Instant currency switcher supporting **₹ INR, $ USD, € EUR, £ GBP, ¥ JPY, $ CAD, $ AUD, AED** with locale-aware number formatting and currency symbols. |
| **Interactive Dashboard** | Real-time KPI summary (Income, Expenses, Net Savings, Savings Rate) with count-up animations, animated Financial Health Score gauge (0–100), Donut category chart, 6-Month Income vs Expense bar comparison, Cumulative Spend vs Budget Pace trajectory, and interactive 31-day calendar Heatmap with day numbers. |
| **50/30/20 Rule Analysis** | Built-in financial planning framework measuring spending breakdown across Needs (50%), Wants (30%), and Savings (20%) with visual segmented bar. |
| **Envelope Budgeting** | Category-level limits, real-time progress indicators, remaining daily safe-to-spend allowance calculations (`₹X left · ₹Y/day for remaining Z days`), and automatic warning alerts at 80% and 100% capacity. |
| **Milestone Savings Goals** | Goal tracking with target amounts, live progress percentages, deposit & withdrawal actions, and celebratory confetti animations upon completion. |
| **Recurring & Subscriptions** | Automated monthly rule engine (Rent, Wi-Fi, Gym, Netflix, etc.) creating exactly one entry per month on specified days, with upcoming renewal notices and monthly commitment totals. |
| **Predictive Insights** | Weighted linear regression forecasting, statistical anomaly / unusual-spend detector, recurring subscription auditor, and What-If spending reduction simulator with annual savings projection. |
| **Reports & Exporting** | Executive printable monthly statement (print to paper or save as clean PDF), sanitized CSV export and duplicate-safe CSV import, and complete **JSON Database Backup & Restore** for seamless data migration. |
| **Security & Privacy** | Passwords salted and hashed with PBKDF2-SHA256 (150,000 iterations via Web Crypto API), 5-attempt brute force lock-out protection, isolated storage sandbox per account, XSS sanitization, and spreadsheet formula injection defenses. |
| **UX & Micro-Interactions** | Glassmorphic design with ambient radial glow, dynamic dark/light theme toggle, quick month-stepping buttons (`◀` / `▶`), Command Palette (`⌘K` / `Ctrl+K`), and keyboard shortcuts guide (`?`). |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `A` or `N` | Open Add Transaction Modal |
| `/` | Focus Quick-Add Input Bar |
| `[` / `]` | Navigate to Previous / Next Month |
| `1` – `7` | Switch Navigation Tabs |
| `T` | Toggle Dark / Light Theme |
| `?` | View Keyboard Shortcuts Guide |
| `ESC` | Dismiss any open modal |

---

## 📁 Project Architecture

```
smartspend/
├── index.html              # Main application dashboard (requires session)
├── login.html              # Authentication portal (Sign in / Register / 1-Click Demo)
├── package.json            # Project manifest & test runners
├── README.md               # Documentation & user guide
├── css/
│   └── style.css           # Glassmorphic responsive styling, themes, animations
├── js/
│   ├── app.js              # Application controller: views, charts, command palette
│   ├── analytics.js        # Analytics engine: quick-add parser, forecast, 50/30/20, anomalies
│   ├── auth.js             # PBKDF2-SHA256 authentication & session management
│   ├── localapi.js         # Local-first REST API simulator & localStorage database
│   └── login.js            # Authentication UI & password strength meter
├── lib/
│   └── chart.umd.js        # Bundled Chart.js 4.4.1 (100% offline)
└── tests/
    ├── test_local.js       # Unit tests: transactions, budgets, math, CSV, analytics (16 tests)
    ├── test_auth.js        # Auth tests: password hashing, salting, lock-outs, per-user data (8 tests)
    ├── test_ui_flow.js     # End-to-end integration test: simulated UI workflow (9 tests)
    └── smoke_browser.js    # Browser-level validation check
```

---

## 🧪 Automated Tests

Run the test suite using Node.js:

```bash
# Run all test suites
npm test

# Or run individual suites directly:
node tests/test_local.js      # App logic, quick-add parser, budgets, CSV parity
node tests/test_auth.js       # PBKDF2 WebCrypto accounts, isolation, lockouts
node tests/test_ui_flow.js    # End-to-end user workflow & data lifecycle
```
