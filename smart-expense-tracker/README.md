# SmartSpend – Smart Expense Tracker

A responsive, browser-based personal finance dashboard for recording income and expenses, planning monthly budgets, tracking savings goals, and reviewing spending patterns.

> **Project type:** Web Development  
> **Status:** Frontend project  
> **Currency format:** Indian Rupees (INR)

## Overview

SmartSpend helps individuals organise everyday finances in one place. Users can record income and expenses, group transactions by category, set monthly spending limits, manage recurring entries, create savings goals, and review visual reports. The dashboard also provides budget alerts and rule-based insights to help users understand their spending habits.

The application runs directly in the browser. It does not currently require a backend, database server, account registration, or API key.

## Key Features

### 1. Finance dashboard
- Monthly overview of income, expenses, and available balance.
- Financial health score based on tracked financial data.
- Daily spending compared with the expected budget pace.
- Charts for category-wise expenses and income-versus-expense trends.
- Month selector to review a selected month.

### 2. Transaction management
- Add income and expense transactions.
- Choose a category, amount, date, and optional note.
- Search transactions by note or category.
- Filter transactions by category.
- Review a date-sorted transaction history.
- Export transaction records as a CSV file.

### 3. Monthly budgets
- Define spending limits for expense categories.
- Track category-wise budget usage.
- Receive an alert when spending reaches 80% of a category budget.
- Receive another alert when the budget limit is reached.

### 4. Recurring transactions
- Configure recurring income or expenses.
- Choose a category, amount, day of the month, and description.
- Automatically add the current month's recurring entry when its scheduled day is reached.
- Avoid duplicate recurring entries for the same month.

### 5. Savings goals
- Create a goal with a target amount.
- Track saved progress against each target.
- Monitor progress towards personal savings milestones.

### 6. Reports
- Review monthly financial summaries.
- Compare income and expenses across months.
- View historical activity for months with recorded transactions.

### 7. Insights and recommendations
- Estimate next month's expenses using recent spending history.
- Highlight unusual spending compared with previous months.
- Generate suggested category budgets from average spending.
- Apply suggested budgets from the insights view.
- Display savings-rate guidance when income is available.

### 8. User experience
- Responsive layout for desktop and smaller screens.
- Light and dark theme support, including system theme preference.
- Animated charts, cards, progress indicators, and notifications.
- Demo data to explore the dashboard without entering transactions manually.

## Technology Stack

| Technology | Purpose |
| --- | --- |
| HTML5 | Page structure and application sections |
| CSS3 | Responsive styling, themes, layouts, and animations |
| JavaScript (Vanilla) | Application logic, calculations, interactions, and state management |
| Chart.js 4.4.1 | Financial charts and visualisations |
| Browser Local Storage | Persist transactions, budgets, recurring entries, and goals |
| CSV | Export transaction data |

## Project Structure

```
Smart_Spend/
└── smart-expense-tracker/
    ├── index.html       # Main application page and dashboard sections
    ├── style.css        # Styling, responsive layout, themes, and animations
    ├── script.js        # Application logic, data handling, and calculations
    └── README.md        # Project documentation
```

## Getting Started

### Prerequisites
- A modern web browser such as Google Chrome, Microsoft Edge, Firefox, or Safari.
- An internet connection when loading the Chart.js library from its CDN.

No Node.js installation, package manager, database setup, or build process is needed for the current version.

### Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/Mohit12212/Smart_Spend.git
   ```

2. Open the project folder:

   ```bash
   cd Smart_Spend/smart-expense-tracker
   ```

3. Open `index.html` in your browser.

   Alternatively, open the folder in Visual Studio Code and use the **Live Server** extension to serve `index.html`.

## How to Use

1. Open the application and choose a month from the month selector.
2. Select **Demo data** to load sample transactions and explore the dashboard. Loading demo data can replace existing data after confirmation.
3. Open **Transactions** to add income or expenses. Enter a positive amount, choose a date and category, and optionally add a note.
4. Open **Budgets** to set monthly category limits and monitor alerts.
5. Open **Recurring** to configure monthly entries such as rent, subscriptions, or salary.
6. Open **Goals** to create savings targets and follow their progress.
7. Use **Reports** to review monthly financial activity.
8. Open **Insights** to view estimates, unusual-spending indicators, and budget recommendations.
9. Use **Export CSV** in Transactions to download transaction records.

## Data Storage and Privacy

- Application data is stored locally in the browser using the `localStorage` key `smart-expense-v1`.
- Data is associated with the browser and origin used to open the application. It is not automatically synchronised across devices or browsers.
- Clearing browser site data can remove locally stored application records.
- The current project has no user authentication, cloud database, server-side backup, or multi-user synchronisation.
- Avoid entering sensitive financial or personal information on shared devices.

## Application Logic

The current version uses client-side JavaScript for its calculations and data operations:

- Transactions are grouped by month and by income/expense type.
- Category totals are calculated from recorded expenses.
- Budget progress is compared against configured category limits.
- Recurring entries are generated for the current month when due, with a duplicate check based on recurring item and month.
- Reports and forecasts are derived from transaction history already stored in the browser.
- Insights and budget suggestions are rule-based calculations; they are not generated by a machine-learning model or an external AI service.

## Known Limitations

- Data is stored only in browser Local Storage; there is no remote database or account-based access.
- There is no authentication or role management.
- Data does not automatically sync between devices.
- Forecasts and recommendations are heuristic estimates based on available transaction history, not guaranteed predictions.
- Chart.js is loaded from a CDN, so charts require network access unless the dependency is hosted locally.
- CSV export is available; CSV import and automated bank integration are not part of the current implementation.

## Future Enhancements

Potential improvements for a future release include:

- Backend API and database integration.
- Secure authentication and individual user accounts.
- Cloud backup and cross-device synchronisation.
- CSV import and richer export/report formats.
- Custom categories and recurring schedules.
- Improved forecasting with configurable assumptions.
- Unit and integration tests.
- Deployment with a hosted demo.

## Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m "Add your feature"`.
4. Push the branch: `git push origin feature/your-feature`.
5. Open a pull request describing your changes.

## License

No license file is currently included in this repository. Unless a license is added, the project should be treated as **all rights reserved** by its owner.

---

**SmartSpend – Take control of your everyday finances.**
