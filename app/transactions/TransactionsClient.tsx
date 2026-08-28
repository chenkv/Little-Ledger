"use client";

import useSWR from "swr";
import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { transactions_get } from "@/types/api-res-types";

async function fetcher(url: string): Promise<transactions_get> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch products");
  return response.json();
}

const dummyTransactions = [
  {
    id: 1,
    name: "Kroger",
    amount: 52.13,
    date: "2024-04-21",
    category: "Groceries",
  },
  {
    id: 2,
    name: "Uber",
    amount: 18.9,
    date: "2024-04-20",
    category: "Transportation",
  },
  {
    id: 3,
    name: "Starbucks",
    amount: 6.75,
    date: "2024-04-20",
    category: "Eating Out",
  },
  {
    id: 4,
    name: "Publix",
    amount: 64.22,
    date: "2024-03-29",
    category: "Groceries",
  },
  {
    id: 5,
    name: "Gas",
    amount: 42.1,
    date: "2024-03-28",
    category: "Transportation",
  },
  {
    id: 6,
    name: "Chipotle",
    amount: 12.5,
    date: "2024-03-27",
    category: "Eating Out",
  },
  {
    id: 7,
    name: "Kroger",
    amount: 52.13,
    date: "2024-04-21",
    category: "Groceries",
  },
  {
    id: 8,
    name: "Uber",
    amount: 18.9,
    date: "2024-04-20",
    category: "Transportation",
  },
  {
    id: 9,
    name: "Starbucks",
    amount: 6.75,
    date: "2024-04-20",
    category: "Eating Out",
  },
  {
    id: 10,
    name: "Publix",
    amount: 64.22,
    date: "2024-03-29",
    category: "Groceries",
  },
  {
    id: 11,
    name: "Gas",
    amount: 42.1,
    date: "2024-03-28",
    category: "Transportation",
  },
  {
    id: 12,
    name: "Chipotle",
    amount: 12.5,
    date: "2024-03-27",
    category: "Eating Out",
  },
];

const categories = [
  "Groceries",
  "Eating Out",
  "Transportation",
  "Entertainment",
];

export default function TransactionsClient() {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/user/transactions`,
    fetcher,
  );

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

  const [uploadFileMessage, setUploadFileMessage] = useState<string | null>(
    null,
  );

  if (isLoading) {
    return <div>Loading</div>;
  } else if (error) {
    return <div>Error!</div>;
  }

  console.log(data);

  const filtered = dummyTransactions.filter((tx) => {
    if (
      filters.search &&
      !tx.name.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    if (filters.category && tx.category !== filters.category) return false;
    if (filters.minAmount && tx.amount < Number(filters.minAmount))
      return false;
    if (filters.maxAmount && tx.amount > Number(filters.maxAmount))
      return false;
    if (filters.startDate && tx.date < filters.startDate) return false;
    if (filters.endDate && tx.date > filters.endDate) return false;
    return true;
  });

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    console.log("Manual transaction added:", manualTx);
  }

  async function uploadTransactions(
    transactions: Array<parsed_transaction_row>,
  ) {
    const transParsed = transactions.map((t) => ({
      ...t,
      amount: parseFloat(String(t.amount)),
    }));

    const request = await fetch("/api/user/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(transParsed),
    });

    if (!request.ok) {
      setUploadFileMessage("Failed to post transactions");
      console.log(await request.json());
      return;
    }
    setUploadFileMessage("Successfully posted all transactions!");

    const response = await request.json();
    console.log(response);
  }

  async function handleUpload(e: React.SubmitEvent) {
    e.preventDefault();
    const fileInput = e.currentTarget.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length <= 0) {
      setUploadFileMessage("Please select a file to upload.");
      return;
    }

    const bankSelect = e.currentTarget.querySelector(
      "select",
    ) as HTMLSelectElement;
    if (!bankSelect.value) {
      setUploadFileMessage("Please select a bank.");
      return;
    }

    setUploadFileMessage(null);

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("meta", `{"source": "${bankSelect.value}"}`);

    const request = await fetch("/api/user/statements/parser", {
      method: "POST",
      body: form,
    });

    if (!request.ok) {
      try {
        setUploadFileMessage(
          "Failed to parse: " + (await request.json()).message,
        );
      } catch {
        setUploadFileMessage("Failed to parse file: Serverside Error");
      }

      return;
    }

    const transactions = await request.json();

    uploadTransactions(transactions.transactions);
  }

  return (
    <DashboardLayout
      content={
        <div className="mx-auto space-y-10">
          {/* Page Title */}
          <h1 className="text-3xl font-bold">Transactions</h1>

          <section className="flex flex-row gap-6">
            {/* All Transactions */}
            <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4 flex-1">
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

            <section className="flex flex-col gap-6 w-1/3">
              {/* Filters */}
              <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
                <h2 className="text-xl font-semibold">Filters</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Search by name"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />

                  <select
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Min Amount"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.minAmount}
                    onChange={(e) =>
                      setFilters({ ...filters, minAmount: e.target.value })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Max Amount"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.maxAmount}
                    onChange={(e) =>
                      setFilters({ ...filters, maxAmount: e.target.value })
                    }
                  />

                  <input
                    type="date"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters({ ...filters, startDate: e.target.value })
                    }
                  />

                  <input
                    type="date"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters({ ...filters, endDate: e.target.value })
                    }
                  />
                </div>
              </section>

              {/* Upload Bank Statement */}
              <form
                onSubmit={handleUpload}
                className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4"
              >
                <h2 className="text-xl font-semibold">Upload Bank Statement</h2>

                <input
                  type="file"
                  accept=".csv,.pdf,.ofx"
                  className="block w-full text-sm bg-[var(--card)] dark:bg-[var(--card-dark)] text-[var(--text-muted)] dark:text-[var(--text-muted-dark)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] dark:file:bg-[var(--primary-dark)] file:text-white hover:file:bg-[var(--primary-hover)] dark:hover:file:bg-[var(--primary-hover-dark)]"
                />

                <select className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]">
                  <option value="">Select a Bank</option>
                  <option value="chase">Chase</option>
                  <option value="american-express">American Express</option>
                  <option value="discover">Discover</option>
                </select>

                <button
                  type="submit"
                  className="w-full py-2 rounded-md font-medium text-white hover:cursor-pointer bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
                >
                  Submit
                </button>

                {uploadFileMessage && (
                  <p className="text-center text-[var(--text-danger)] dark:text-[var(--text-danger-dark)]">
                    {uploadFileMessage}
                  </p>
                )}
              </form>

              {/* Manually Add Transaction */}
              <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
                <h2 className="text-xl font-semibold">Add Transaction</h2>

                <form onSubmit={handleManualAdd} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Name"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.name}
                    onChange={(e) =>
                      setManualTx({ ...manualTx, name: e.target.value })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Amount"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.amount}
                    onChange={(e) =>
                      setManualTx({ ...manualTx, amount: e.target.value })
                    }
                  />

                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.date}
                    onChange={(e) =>
                      setManualTx({ ...manualTx, date: e.target.value })
                    }
                  />

                  <select
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.category}
                    onChange={(e) =>
                      setManualTx({ ...manualTx, category: e.target.value })
                    }
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
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
            </section>
          </section>
        </div>
      }
    />
  );
}
