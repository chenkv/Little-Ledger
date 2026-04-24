"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";

const dummyTransactions = [
  { id: 1, name: "Kroger", amount: 52.13, date: "2024-04-21", category: "Groceries" },
  { id: 2, name: "Uber", amount: 18.90, date: "2024-04-20", category: "Transportation" },
  { id: 3, name: "Starbucks", amount: 6.75, date: "2024-04-20", category: "Eating Out" },
  { id: 4, name: "Publix", amount: 64.22, date: "2024-03-29", category: "Groceries" },
  { id: 5, name: "Gas", amount: 42.10, date: "2024-03-28", category: "Transportation" },
  { id: 6, name: "Chipotle", amount: 12.50, date: "2024-03-27", category: "Eating Out" },
];

const categories = ["Groceries", "Eating Out", "Transportation", "Entertainment"];

export default function TransactionsPage() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
  });

  const [manualTx, setManualTx] = useState({
    name: "",
    amount: "",
    date: "",
    category: "",
  });

  const filtered = dummyTransactions.filter((tx) => {
    if (filters.search && !tx.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && tx.category !== filters.category) return false;
    if (filters.minAmount && tx.amount < Number(filters.minAmount)) return false;
    if (filters.maxAmount && tx.amount > Number(filters.maxAmount)) return false;
    if (filters.startDate && tx.date < filters.startDate) return false;
    if (filters.endDate && tx.date > filters.endDate) return false;
    return true;
  });

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    console.log("Manual transaction added:", manualTx);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) console.log("Uploaded bank statement:", file.name);
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]">

      <Sidebar />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-10">

          {/* Page Title */}
          <h1 className="text-3xl font-bold">Transactions</h1>

          {/* Filters */}
          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Filters</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <input
                type="text"
                placeholder="Search by name"
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />

              <select
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Min Amount"
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              />

              <input
                type="number"
                placeholder="Max Amount"
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              />

              <input
                type="date"
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />

              <input
                type="date"
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />

            </div>
          </section>

          {/* All Transactions */}
          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">All Transactions</h2>

            {filtered.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between py-3 border-b border-[var(--divider)] dark:border-[var(--divider-dark)] last:border-none"
              >
                <div>
                  <p className="font-medium">{tx.name}</p>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                    {tx.date} • {tx.category}
                  </p>
                </div>
                <p className="font-semibold">${tx.amount.toFixed(2)}</p>
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-center text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                No transactions match your filters.
              </p>
            )}
          </section>

          {/* Upload Bank Statement */}
          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Upload Bank Statement</h2>

            <input
              type="file"
              accept=".csv,.pdf,.ofx"
              onChange={handleUpload}
              className="block w-full text-sm"
            />

            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
              (This is a placeholder — parsing logic comes later.)
            </p>
          </section>

          {/* Manually Add Transaction */}
          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Add Transaction</h2>

            <form onSubmit={handleManualAdd} className="space-y-4">

              <input
                type="text"
                placeholder="Name"
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={manualTx.name}
                onChange={(e) => setManualTx({ ...manualTx, name: e.target.value })}
              />

              <input
                type="number"
                placeholder="Amount"
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={manualTx.amount}
                onChange={(e) => setManualTx({ ...manualTx, amount: e.target.value })}
              />

              <input
                type="date"
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={manualTx.date}
                onChange={(e) => setManualTx({ ...manualTx, date: e.target.value })}
              />

              <select
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={manualTx.category}
                onChange={(e) => setManualTx({ ...manualTx, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="submit"
                className="w-full py-2 rounded-md font-medium text-white bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
              >
                Add Transaction
              </button>
            </form>
          </section>

        </div>
      </main>
    </div>
  );
}
