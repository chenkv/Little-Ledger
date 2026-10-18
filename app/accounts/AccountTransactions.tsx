import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { useEffect, useState } from "react";
import {
  financial_account_get,
  transactions_get,
  categories_get,
} from "@/types/api-res-types";
import TransactionsFilter, {
  type TransactionFilterValues,
} from "./TransactionsFilter";
import AddTransactionsPopup from "./AddTransactionsPopup";

type createAccountTransactionProps = {
  accounts: financial_account_get[];
  accountId: number | null;
};

type TransactionEditDraft = {
  date: string;
  description: string;
  category_id: number | null;
  amount: string;
};

const PAGE_SIZE_COOKIE = "little-ledger-transaction-page-size";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

async function fetcherAccount(url: string): Promise<transactions_get> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch account data.");
  return response.json();
}

async function fetcherCategories(url: string): Promise<categories_get> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch categories data.");
  return response.json();
}

export default function AccountTransactions({
  accounts,
  accountId,
}: createAccountTransactionProps) {
  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useSWRImmutable("/api/user/categories", fetcherCategories);

  const [searchPage, setSearchPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [enableFilters, setEnableFilters] = useState(false);
  const [addTransactionPopup, setAddTransactionPopup] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    number | null
  >(null);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionEditDraft | null>(null);
  const [transactionEditError, setTransactionEditError] = useState<
    string | null
  >(null);
  const [filters, setFilters] = useState<TransactionFilterValues>({
    name: "",
    category: "",
    min_amount: "",
    max_amount: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    const savedPageSize = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${PAGE_SIZE_COOKIE}=`))
      ?.split("=")[1];
    const parsedPageSize = Number(savedPageSize);

    if (PAGE_SIZE_OPTIONS.includes(parsedPageSize)) {
      setPageSize(parsedPageSize);
    }
  }, []);

  function handlePageSizeChange(value: string) {
    const nextPageSize = Number(value);
    if (!PAGE_SIZE_OPTIONS.includes(nextPageSize)) {
      return;
    }

    setPageSize(nextPageSize);
    setSearchPage(1);

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${PAGE_SIZE_COOKIE}=${nextPageSize}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }

  function queryParams() {
    const params = new URLSearchParams();
    if (accountId) {
      params.append("accountId", accountId.toString());
    } else {
      return "";
    }
    if (filters.name) {
      params.append("name", filters.name);
    }
    if (filters.category) {
      params.append("category", filters.category);
    }
    if (filters.min_amount !== "") {
      params.append("minAmount", filters.min_amount);
    }
    if (filters.max_amount !== "") {
      params.append("maxAmount", filters.max_amount);
    }
    if (filters.start_date) {
      params.append("minDate", filters.start_date);
    }
    if (filters.end_date) {
      params.append("maxDate", filters.end_date);
    }
    params.append("page", searchPage.toString());
    params.append("limit", pageSize.toString());
    return params.toString() ? `?${params.toString()}` : "";
  }

  const { data, error, isLoading, mutate } = useSWR(
    accountId === null ? null : `/api/user/transactions${queryParams()}`,
    fetcherAccount,
  );

  function startEditingTransaction(
    transaction: transactions_get["transactions"][number],
  ) {
    if (editingTransactionId === transaction.id) {
      return;
    }

    setEditingTransactionId(transaction.id);
    setEditingTransaction({
      date: transaction.date,
      description: transaction.description ?? "",
      category_id: transaction.category_id,
      amount: String(transaction.amount),
    });
    setTransactionEditError(null);
  }

  function handleTransactionRowClick(
    event: React.MouseEvent<HTMLLIElement>,
    transaction: transactions_get["transactions"][number],
  ) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, input, select")
    ) {
      return;
    }
    startEditingTransaction(transaction);
  }

  function handleTransactionRowKeyDown(
    event: React.KeyboardEvent<HTMLLIElement>,
    transaction: transactions_get["transactions"][number],
  ) {
    if (
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      startEditingTransaction(transaction);
    }
  }

  function updateEditingTransaction(updates: Partial<TransactionEditDraft>) {
    setEditingTransaction((previous) =>
      previous ? { ...previous, ...updates } : previous,
    );
    setTransactionEditError(null);
  }

  async function handleDoneEditingTransaction() {
    if (!editingTransaction || editingTransactionId === null) {
      return;
    }

    const amount = Number(editingTransaction.amount);
    if (
      !editingTransaction.date ||
      !editingTransaction.description.trim() ||
      editingTransaction.amount.trim() === "" ||
      !Number.isFinite(amount)
    ) {
      setTransactionEditError(
        "Enter a date, description, and valid amount before saving.",
      );
      return;
    }

    setTransactionEditError(null);

    try {
      const response = await fetch("/api/user/transactions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTransactionId,
          date: editingTransaction.date,
          description: editingTransaction.description,
          category_id: editingTransaction.category_id,
          amount,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to update transaction.");
      }

      setEditingTransactionId(null);
      setEditingTransaction(null);
      void mutate();
    } catch (updateError) {
      setTransactionEditError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update transaction.",
      );
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    if (editingTransactionId === null) {
      return;
    }

    setTransactionEditError(null);

    try {
      const response = await fetch("/api/user/transactions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [transactionId] }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete transaction.");
      }

      setEditingTransactionId(null);
      setEditingTransaction(null);
      void mutate();
    } catch (deleteError) {
      setTransactionEditError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete transaction.",
      );
    }
  }

  if (accountId === null) {
    return (
      <div className="p-6 bg-(--surface) dark:bg-(--surface-dark)">
        <h2 className="text-xl font-semibold mb-2">Transactions</h2>
        <p className="text-sm mb-4">Select an account to view transactions.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-(--surface) dark:bg-(--surface-dark)">
      {addTransactionPopup && (
        <AddTransactionsPopup
          accountId={accountId}
          institution={accounts.find((a) => a.id === accountId)?.institution}
          categories={categoriesData?.categories ?? []}
          setTransactionPopup={setAddTransactionPopup}
          onTransactionsAdded={() => {
            setAddTransactionPopup(false);
            mutate();
          }}
        />
      )}

      <div className="flex space-x-4 items-center mb-4">
        <h2 className="text-2xl font-semibold">
          Transactions for {accounts.find((a) => a.id === accountId)?.name}
        </h2>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setAddTransactionPopup((enabled) => !enabled)}
        >
          Add Transaction(s)
        </button>
        <button
          type="button"
          aria-expanded={enableFilters}
          aria-controls="transaction-filters"
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setEnableFilters((enabled) => !enabled)}
        >
          Filters
        </button>
      </div>
      <TransactionsFilter
        categories={categoriesData?.categories ?? []}
        enabled={enableFilters}
        onApplyFilters={(submittedFilters) => {
          setFilters(submittedFilters);
          setSearchPage(1);
        }}
      />

      <div className="mt-4">
        {isLoading || categoriesLoading ? (
          <p>Loading transactions...</p>
        ) : error || categoriesError ? (
          <p>Error loading transactions.</p>
        ) : data?.transactions.length ? (
          <>
            <ul className="space-y-2">
              {data.transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  role="group"
                  aria-label={`Transaction ${transaction.id}${editingTransactionId === transaction.id ? ", editing" : ", click to edit"}`}
                  tabIndex={0}
                  onClick={(event) =>
                    handleTransactionRowClick(event, transaction)
                  }
                  onKeyDown={(event) =>
                    handleTransactionRowKeyDown(event, transaction)
                  }
                  className="flex space-x-2 justify-between items-center p-4 select-none bg-(--surface-variant) dark:bg-(--surface-variant-dark) ring-2 ring-transparent hover:ring-(--primary-dark) hover:cursor-pointer rounded-lg"
                >
                  {editingTransactionId === transaction.id &&
                  editingTransaction ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Delete transaction ${transaction.id}`}
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="text-red-500 hover:text-red-700 hover:cursor-pointer"
                      >
                        X
                      </button>
                      <input
                        type="date"
                        aria-label="Transaction date"
                        value={editingTransaction.date}
                        onChange={(event) =>
                          updateEditingTransaction({
                            date: event.currentTarget.value,
                          })
                        }
                        className="flex-none px-2 py-1 border border-gray-300 dark:border-(--border-dark) rounded-md"
                      />
                      <input
                        type="text"
                        aria-label="Transaction description"
                        value={editingTransaction.description}
                        onChange={(event) =>
                          updateEditingTransaction({
                            description: event.currentTarget.value,
                          })
                        }
                        className="grow min-w-0 px-2 py-1 border border-gray-300 dark:border-(--border-dark) rounded-md"
                      />
                      <select
                        aria-label="Transaction category"
                        value={editingTransaction.category_id ?? ""}
                        onChange={(event) =>
                          updateEditingTransaction({
                            category_id: event.currentTarget.value
                              ? Number(event.currentTarget.value)
                              : null,
                          })
                        }
                        className="flex-none max-w-48 px-2 py-1 border border-gray-300 dark:border-(--border-dark) rounded-md"
                      >
                        <option value="">Uncategorized</option>
                        {categoriesData?.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name} ({category.type})
                          </option>
                        ))}
                      </select>
                      <label className="flex-none">
                        <span className="sr-only">Transaction amount</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Transaction amount"
                          value={editingTransaction.amount}
                          onChange={(event) =>
                            updateEditingTransaction({
                              amount: event.currentTarget.value,
                            })
                          }
                          className="w-28 px-2 py-1 border border-gray-300 dark:border-(--border-dark) rounded-md"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDoneEditingTransaction}
                        className="text-green-300 hover:text-green-500 hover:cursor-pointer"
                      >
                        ✓
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="flex-none w-30 font-medium">
                        {transaction.date}
                      </p>
                      <p className="grow wrap-anywhere font-medium">
                        {transaction.description}
                      </p>
                      <p className="flex-none w-30 font-medium">
                        {categoriesData?.categories.find(
                          (c) => c.id === transaction.category_id,
                        )?.name || ""}
                      </p>
                      <div
                        className={`flex-none flex justify-end w-30 font-semibold ${transaction.amount > 0 ? "text-red-300" : "text-green-300"}`}
                      >
                        {transaction.amount > 0 ? "-" : "+"}$
                        {Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {transactionEditError && (
              <p role="alert" className="mt-2 text-red-400">
                {transactionEditError}
              </p>
            )}
            <nav
              aria-label="Transaction pages"
              className="mt-4 flex flex-col flex-wrap items-center justify-center gap-4"
            >
              <div className="flex gap-4 items-center justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setSearchPage(Math.max(1, data.pagination.page - 1))
                  }
                  disabled={data.pagination.page <= 1 || isLoading}
                  className="rounded bg-(--primary-dark) px-4 py-2 font-bold text-white enabled:hover:bg-(--primary-hover-dark) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                <span aria-live="polite">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSearchPage(
                      Math.min(
                        data.pagination.totalPages,
                        data.pagination.page + 1,
                      ),
                    )
                  }
                  disabled={
                    data.pagination.page >= data.pagination.totalPages ||
                    isLoading
                  }
                  className="rounded bg-(--primary-dark) px-4 py-2 font-bold text-white enabled:hover:bg-(--primary-hover-dark) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <label className="flex items-center gap-2">
                Results per page
                <select
                  value={pageSize}
                  onChange={(event) =>
                    handlePageSizeChange(event.currentTarget.value)
                  }
                  className="rounded border border-gray-300 bg-white px-2 py-2 text-black dark:border-(--border-dark) dark:bg-(--card-dark) dark:text-white"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </nav>
          </>
        ) : (
          <p>No transactions found.</p>
        )}
      </div>
    </div>
  );
}
