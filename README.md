# SmartSpend

**SmartSpend** is a local-first personal finance dashboard for recording income and expenses, planning category budgets, tracking savings goals, and exploring spending patterns.

## Features

- Natural-language quick entry for everyday transactions
- Monthly dashboard with income, expenses, savings, and charts
- Category budgets with spending thresholds
- Savings goals and recurring transaction tracking
- Spending forecasts and unusual-spend insights
- CSV import/export and JSON backup/restore
- Multi-currency display and light/dark themes
- Browser-based operation without a required application server

## Getting started

### Requirements
- A modern browser (Chrome, Edge, Firefox, or Safari)
- Node.js for running automated tests

### Run the app
1. Clone or download this repository.
2. From the project root, start a static server:

   ```bash
   npm run serve
   ```

3. Open **http://localhost:8002**.
4. Use the sign-in screen to explore the demo or create a local account.

You can also open `login.html` directly in a modern browser, but using a local server is recommended for consistent browser API behaviour.

## Development and tests

Run the automated test suites:

```bash
npm test
```

Run a JavaScript syntax check:

```bash
npm run check
```

Run an individual test suite:

```bash
npm run test:local
npm run test:auth
npm run test:flow
```

The browser smoke test may require additional browser setup; see `tests/smoke_browser.js`.

## Project structure

```text
Smart_Spend/
├── index.html             # Main dashboard
├── login.html             # Sign-in and account creation
├── css/
│   └── style.css          # Layout, responsive styles, and themes
├── js/
│   ├── app.js             # Main UI and application flow
│   ├── analytics.js       # Quick-add parsing and analytics helpers
│   ├── auth.js             # Local authentication and session handling
│   ├── localapi.js         # Browser-storage data layer
│   └── login.js            # Authentication page interactions
├── lib/
│   └── chart.umd.js       # Bundled Chart.js library
├── tests/
│   ├── test_local.js
│   ├── test_auth.js
│   ├── test_ui_flow.js
│   └── smoke_browser.js
├── package.json
├── .gitignore
└── README.md
```

## Data storage and privacy

SmartSpend stores account and finance data in the browser's local storage. Data is not automatically synced across devices, and clearing browser data may remove it. Export a JSON backup regularly.

Password hashing does **not** encrypt all stored financial records. This is a client-side project, not a bank-grade secure vault. Review and harden the security model before using it for sensitive production data or making stronger privacy/security claims.

## Technology

- HTML5 and CSS3
- Vanilla JavaScript
- Browser Web Crypto API
- Browser local storage
- Bundled Chart.js
- Node.js test runner

## License

This project declares the MIT License in `package.json`.
