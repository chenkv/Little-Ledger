"use client";

import useSWR from "swr";
import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AddTransactionsOverlay from "./AddTransactionsOverlay";
import { transactions_get } from "@/types/api-res-types";

async function fetcher(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
}

export default function TransactionsClient() {
  const [page, setPage] = useState(1);

  const {
    data: transactions,
    error: transactionsError,
    isLoading: transactionsLoading,
  } = useSWR<transactions_get>(`/api/user/transactions?page=${page}`, fetcher);

  const {
    data: accounts,
    error: accountsError,
    isLoading: accountsLoading,
  } = useSWR("/api/user/financial-accounts", fetcher);

  const {
    data: categories,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useSWR("/api/user/categories", fetcher);

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

  const [addTransactionsList, setAddTransactionsList] = useState({
    transactions: [],
    financial_account: null,
  });

  if (transactionsLoading || accountsLoading || categoriesLoading) {
    return <div>Loading</div>;
  }

  if (transactionsError || accountsError || categoriesError) {
    return <div>Error!</div>;
  }

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    console.log("Manual transaction added:", manualTx);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fileInput = e.currentTarget.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    if (!fileInput?.files?.length) {
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
    form.append(
      "meta",
      JSON.stringify({
        source: bankSelect.value,
      }),
    );

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

    const parseResponse = await request.json();

    const matchingAccount = accounts.accounts.find(
      (account) => account.institution === bankSelect.value,
    );

    setAddTransactionsList({
      transactions: parseResponse.transactions,
      financial_account: matchingAccount,
    });
  }

  /*
   * Convert API transactions into the shape
   * used by the UI.
   */
  const formattedTransactions = transactions.transactions.map((tx) => {
    const category = categories.categories.find((c) => c.id === tx.category_id);

    return {
      ...tx,
      name: tx.description,
      category: category?.name ?? "No Category",
    };
  });

  /*
   * Apply client-side filters to the current page.
   */
  const filtered = formattedTransactions.filter((tx) => {
    if (
      filters.search &&
      !tx.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    if (filters.category && tx.category !== filters.category) {
      return false;
    }

    if (filters.minAmount && tx.amount < Number(filters.minAmount)) {
      return false;
    }

    if (filters.maxAmount && tx.amount > Number(filters.maxAmount)) {
      return false;
    }

    if (filters.startDate && tx.date < filters.startDate) {
      return false;
    }

    if (filters.endDate && tx.date > filters.endDate) {
      return false;
    }

    return true;
  });

  return (
    <DashboardLayout
      content={
        <div className="mx-auto space-y-10">
          <AddTransactionsOverlay
            transactions={addTransactionsList}
            updateTransactions={setAddTransactionsList}
            allCategories={categories.categories}
            allAccounts={accounts.accounts}
            setFormMessage={setUploadFileMessage}
          />

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
                    <p className="font-medium">{tx.description}</p>

                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                      {tx.date} • {tx.category}
                    </p>
                  </div>

                  <p className="font-semibold">
                    ${Number(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))}

              {filtered.length === 0 && (
                <p className="text-center text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                  No transactions match your filters.
                </p>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span>
                  Page {transactions.pagination.page} of{" "}
                  {transactions.pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= transactions.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
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
                      setFilters({
                        ...filters,
                        search: e.target.value,
                      })
                    }
                  />

                  <select
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="">All Categories</option>

                    {categories.categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Min Amount"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.minAmount}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        minAmount: e.target.value,
                      })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Max Amount"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.maxAmount}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxAmount: e.target.value,
                      })
                    }
                  />

                  <input
                    type="date"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        startDate: e.target.value,
                      })
                    }
                  />

                  <input
                    type="date"
                    className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        endDate: e.target.value,
                      })
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
                  className="block w-full text-sm bg-[var(--card)] dark:bg-[var(--card-dark)] text-[var(--text-muted)] dark:text-[var(--text-muted-dark)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] dark:file:bg-[var(--primary-dark)] file:text-white"
                />

                <select className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]">
                  <option value="">Select a Bank</option>
                  <option value="chase">Chase</option>
                  <option value="american-express">American Express</option>
                  <option value="discover">Discover</option>
                </select>

                <button
                  type="submit"
                  className="w-full py-2 rounded-md font-medium text-white bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
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
                      setManualTx({
                        ...manualTx,
                        name: e.target.value,
                      })
                    }
                  />

                  <input
                    type="number"
                    placeholder="Amount"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.amount}
                    onChange={(e) =>
                      setManualTx({
                        ...manualTx,
                        amount: e.target.value,
                      })
                    }
                  />

                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.date}
                    onChange={(e) =>
                      setManualTx({
                        ...manualTx,
                        date: e.target.value,
                      })
                    }
                  />

                  <select
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={manualTx.category}
                    onChange={(e) =>
                      setManualTx({
                        ...manualTx,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Category</option>

                    {categories.categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
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
