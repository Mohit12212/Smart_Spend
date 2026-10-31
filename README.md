# SmartSpend – Smart Expense Tracker

A responsive web-based personal finance dashboard to track income, expenses, monthly budgets, recurring transactions, savings goals, and spending insights.

## Features
- Dashboard with income, expenses, and balance summaries
- Add, search, and filter transactions
- Category-based monthly budgets and budget alerts
- Recurring income and expense entries
- Savings goals and progress tracking
- Reports and Chart.js visualisations
- Rule-based spending insights and expense estimates
- CSV export
- Responsive layout with light and dark themes
- Browser Local Storage for saving data

## Technology Stack
- **HTML5** – page structure
- **CSS3** – styling, responsive design, themes, and animations
- **Vanilla JavaScript** – application logic and financial calculations
- **Chart.js** – charts and visual reports
- **Local Storage** – browser-side data persistence

## Run the Project
1. Clone this repository:
   ```bash
   git clone https://github.com/Mohit12212/Smart_Spend.git
   ```
2. Open the project directory:
   ```bash
   cd Smart_Spend/smart-expense-tracker
   ```
3. Open `index.html` in your browser, or use Visual Studio Code with the Live Server extension.

No backend or database setup is required for the current version.

## Project Structure
```
Smart_Spend/
├── README.md
└── smart-expense-tracker/
    ├── index.html
    ├── style.css
    ├── script.js
    └── README.md
```

## Data and Limitations
The application stores data in the current browser's Local Storage. Data does not synchronise across devices and there is no account authentication or cloud database. Insights and estimates are rule-based, not AI-generated financial advice. Chart.js is loaded from a CDN and needs an internet connection.

For the complete feature documentation, usage instructions, application logic, limitations, and future enhancements, see the [detailed project README](smart-expense-tracker/README.md).

## Future Enhancements
- Backend API and database integration
- Secure user authentication
- Cloud backup and device synchronisation
- CSV import and more reporting options
- Automated tests and hosted demo

## License
No license file is currently included. Unless a license is added, all rights remain with the project owner.
