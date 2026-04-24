"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";

const dummyData = {
  "2024-04": {
    monthLabel: "April 2024",
    budget: 2000,
    spent: 1450,
    categories: [
      { name: "Groceries", spent: 420, budget: 500 },
      { name: "Eating Out", spent: 260, budget: 300 },
      { name: "Transportation", spent: 120, budget: 200 },
      { name: "Entertainment", spent: 180, budget: 250 },
    ],
    transactions: [
      { name: "Kroger", amount: 52.13, date: "Apr 21" },
      { name: "Uber", amount: 18.90, date: "Apr 20" },
      { name: "Starbucks", amount: 6.75, date: "Apr 20" },
    ],
  },
  "2024-03": {
    monthLabel: "March 2024",
    budget: 2000,
    spent: 1675,
    categories: [
      { name: "Groceries", spent: 510, budget: 500 },
      { name: "Eating Out", spent: 340, budget: 300 },
      { name: "Transportation", spent: 150, budget: 200 },
      { name: "Entertainment", spent: 240, budget: 250 },
    ],
    transactions: [
      { name: "Publix", amount: 64.22, date: "Mar 29" },
      { name: "Gas", amount: 42.10, date: "Mar 28" },
      { name: "Chipotle", amount: 12.50, date: "Mar 27" },
    ],
  },
};

export default function DashboardPage() {
  const monthKeys = Object.keys(dummyData);
  const [activeMonth, setActiveMonth] = useState(monthKeys[0]);

  const data = dummyData[activeMonth];
  const percent = Math.min((data.spent / data.budget) * 100, 100);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Month Carousel */}
          <div className="flex overflow-x-auto gap-3 pb-2">
            {monthKeys.map((key) => (
              <button
                key={key}
                onClick={() => setActiveMonth(key)}
                className={`
                  px-4 py-2 rounded-lg whitespace-nowrap transition
                  ${activeMonth === key
                    ? "bg-[var(--accent)] text-white dark:bg-[var(--accent-dark)]"
                    : "bg-[var(--card)] dark:bg-[var(--card-dark)]"
                  }
                `}
              >
                {dummyData[key].monthLabel}
              </button>
            ))}
          </div>

          {/* Monthly Summary */}
          <div className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow">
            <h2 className="text-xl font-semibold mb-2">This Month</h2>
            <p className="text-sm mb-4">
              ${data.spent} spent of ${data.budget} budget
            </p>

            <div className="w-full h-3 bg-[var(--divider)] dark:bg-[var(--divider-dark)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] dark:bg-[var(--accent-dark)] transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Categories</h2>

            {data.categories.map((cat) => {
              const pct = Math.min((cat.spent / cat.budget) * 100, 100);
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.name}</span>
                    <span>${cat.spent} / ${cat.budget}</span>
                  </div>

                  <div className="w-full h-2 bg-[var(--divider)] dark:bg-[var(--divider-dark)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary)] dark:bg-[var(--primary-dark)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Transactions */}
          <div className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Recent Transactions</h2>

            {data.transactions.map((tx, i) => (
              <div
                key={i}
                className="flex justify-between py-2 border-b border-[var(--divider)] dark:border-[var(--divider-dark)] last:border-none"
              >
                <div>
                  <p className="font-medium">{tx.name}</p>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                    {tx.date}
                  </p>
                </div>
                <p className="font-semibold">${tx.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
