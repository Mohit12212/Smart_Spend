# SmartSpend

Offline-first personal finance dashboard and expense tracker built with HTML, CSS, and vanilla JavaScript.

## Features
- Natural-language expense entry
- Income and expense dashboard with charts
- Category budgets and threshold alerts
- Savings goals and recurring transactions
- Spending forecasts and anomaly detection
- CSV import/export and JSON backup/restore
- Multi-currency display and theme switching
- Local-first operation using browser storage

## Run locally
Open `index.html` in a modern browser, or run `npm run serve` and visit `http://localhost:8002`.

## Demo
Use the demo login on the login screen, or create a local account.

## Tests
Run `npm test` with Node.js installed.

## Project structure
```text
Smart_Spend/
├── index.html
├── login.html
├── css/style.css
├── js/ (app, analytics, auth, localapi, login)
├── lib/chart.umd.js
├── tests/ (local, auth, UI flow, browser smoke)
├── package.json
└── README.md
```

## Privacy and data
SmartSpend stores account and financial data in browser local storage; it does not automatically sync across devices. Clearing browser storage may delete data, so export regular JSON backups. Password hashing does not encrypt all financial records. This project should not be described as a bank-grade secure vault without further security hardening and independent review.

## Technology
HTML5, CSS3, vanilla JavaScript, Web Crypto API, localStorage, bundled Chart.js, and Node.js tests.

## License
MIT
