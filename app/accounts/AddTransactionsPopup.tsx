"use client";

import { useState } from "react";
import { parsed_transaction_row } from "@/types/api-res-types";

type AddTransactionsPopupProps = {
  accountId: number;
  institution?: string | null;
  categories?: { id: number; name: string; type: string }[];
  setTransactionPopup: (enabled: boolean) => void;
  onTransactionsAdded: () => void;
};

type StagedTransaction = {
  description: string | null;
  date: string | null;
  category_id: number | null;
  amount: number;
};

type EditingTransaction = Omit<StagedTransaction, "amount"> & {
  amount: string;
};

export default function AddTransactionsPopup({
  accountId,
  institution,
  categories,
  setTransactionPopup,
  onTransactionsAdded,
}: AddTransactionsPopupProps) {
  const [transactions, setTransactions] = useState<StagedTransaction[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<EditingTransaction | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("Upload CSV or PDF");
  const [uploadFileError, setUploadFileError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateEditingTransaction(updates: Partial<EditingTransaction>) {
    setEditingTransaction((prev) => (prev ? { ...prev, ...updates } : prev));
    setErrorMessage(null);
  }

  function toggleTransactionEditing(index: number) {
    if (editingIndex === index) {
      return;
    }

    setEditingIndex(index);
    setEditingTransaction({
      ...transactions[index],
      amount: String(transactions[index].amount),
    });
    setErrorMessage(null);
  }

  function handleDoneEditing() {
    if (editingIndex === null || !editingTransaction) {
      return;
    }

    const amount = Number(editingTransaction.amount);
    if (
      !editingTransaction.date?.trim() ||
      !editingTransaction.description?.trim() ||
      editingTransaction.amount.trim() === "" ||
      !Number.isFinite(amount)
    ) {
      setErrorMessage(
        "Enter a date, description, and valid amount before saving.",
      );
      return;
    }

    const updatedTransaction: StagedTransaction = {
      ...editingTransaction,
      amount,
    };
    setTransactions((prev) =>
      prev.map((transaction, index) =>
        index === editingIndex ? updatedTransaction : transaction,
      ),
    );
    setEditingIndex(null);
    setEditingTransaction(null);
    setErrorMessage(null);
  }

  function handleTransactionRowClick(
    event: React.MouseEvent<HTMLLIElement>,
    index: number,
  ) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, input, select")
    ) {
      return;
    }
    toggleTransactionEditing(index);
  }

  function handleTransactionRowKeyDown(
    event: React.KeyboardEvent<HTMLLIElement>,
    index: number,
  ) {
    if (
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      toggleTransactionEditing(index);
    }
  }

  async function handleSubmit() {
    setErrorMessage(null);

    if (editingIndex !== null) {
      setErrorMessage("Click Done to save the row edits before submitting.");
      return;
    }

    const transactionsToSubmit = transactions.map((transaction) => ({
      ...transaction,
      financial_account_id: accountId,
    }));

    if (
      transactionsToSubmit.some(
        (transaction) =>
          !transaction.date?.trim() ||
          !transaction.description?.trim() ||
          !Number.isFinite(transaction.amount),
      )
    ) {
      setErrorMessage(
        "Each transaction needs a date, description, and valid amount.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionsToSubmit),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to add transactions.");
      }

      await onTransactionsAdded();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add transactions.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddTransaction(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const newTransaction = {
      description: formData.get("description") as string,
      date: formData.get("date") as string,
      category_id: Number(formData.get("category_id")) as number | null,
      amount: parseFloat(formData.get("amount") as string),
    };

    console.log("Adding transaction:", newTransaction);

    setTransactions((prev) => [...prev, newTransaction]);
    form.reset();
  }

  function removeTransaction(index: number) {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingTransaction(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  }

  function formatDateForInput(date: string): string {
    const currentYear = new Date().getFullYear();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // MM/DD/YYYY -> YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [month, day, year] = date.split("/");
      return `${year}-${month}-${day}`;
    }

    // MM/DD/YY -> YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(date)) {
      const [month, day, year] = date.split("/");

      const currentCentury = Math.floor(currentYear / 100) * 100;
      const currentTwoDigitYear = currentYear % 100;
      const twoDigitYear = Number(year);
      const fullYear =
        twoDigitYear <= currentTwoDigitYear
          ? currentCentury + twoDigitYear
          : currentCentury - 100 + twoDigitYear;

      return `${fullYear}-${month}-${day}`;
    }

    // MM/DD -> YYYY-MM-DD
    if (/^\d{2}\/\d{2}$/.test(date)) {
      const [month, day] = date.split("/");
      return `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return "";
  }

  async function handleUploadStatement(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    setUploadFileError(null);

    const fileInput = e.currentTarget.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setErrorMessage("Please select a file to upload.");
      return;
    }

    const form = new FormData();

    form.append("file", fileInput.files[0]);
    form.append(
      "meta",
      JSON.stringify({
        source: institution,
      }),
    );

    const request = await fetch("/api/user/statements/parser", {
      method: "POST",
      body: form,
    });

    if (!request.ok) {
      setUploadFileError("Failed to parse: " + (await request.json()).message);

      return;
    }

    const parseResponse: {
      message: string;
      transactions: parsed_transaction_row[];
    } = await request.json();

    try {
      const temp = parseResponse.transactions.map((el) => {
        return {
          description: el.description,
          date: formatDateForInput(el.date),
          category_id: null,
          amount: Number(el.amount),
        };
      });
      setTransactions((prev) => [...prev, ...temp]);
      fileInput.value = "";
      setSelectedFileName("Upload CSV or PDF");
    } catch {
      setUploadFileError("Failed to parse transactions");
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <button
        type="button"
        aria-label="Close create account form"
        className="absolute inset-0 bg-black/50"
        onClick={() => setTransactionPopup(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
        className="relative w-11/12 h-11/12 overflow-y-scroll bg-white dark:bg-(--popup-card-dark) p-6 rounded-lg shadow-lg z-10"
      >
        <h2 id="create-account-title" className="text-xl font-semibold mb-4">
          Add Transaction(s) to Account
        </h2>
        <div className="flex items-stretch gap-4">
          <form
            className="flex space-x-4 items-center"
            onSubmit={handleAddTransaction}
          >
            <div className="flex flex-col space-y-2">
              <input
                type="text"
                name="description"
                required
                placeholder="Transaction Description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
              />
              <div className="space-x-2">
                <input
                  type="date"
                  name="date"
                  required
                  className="px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
                />
                <select
                  name="category_id"
                  required
                  className="px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
                >
                  <option value="">Select a Category</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.type})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  required
                  placeholder="Amount"
                  className="w-30 px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 w-min h-min hover:cursor-pointer text-white font-bold py-2 px-4 rounded"
            >
              Add Transaction
            </button>
          </form>

          <div
            aria-hidden="true"
            className="self-stretch border-l border-gray-300 dark:border-(--border-dark)"
          />

          <form
            className="flex flex-col space-y-2 items-center justify-center"
            onSubmit={handleUploadStatement}
          >
            <div className="w-full flex space-x-2">
              <label
                htmlFor="transaction-file"
                className="grow cursor-pointer rounded-md bg-gray-200 px-3 py-2 dark:bg-(--card-dark)"
              >
                {selectedFileName}
              </label>
              <input
                id="transaction-file"
                type="file"
                accept=".csv,.pdf"
                className="sr-only"
                onChange={(event) =>
                  setSelectedFileName(
                    event.currentTarget.files?.[0]?.name ?? "Upload CSV or PDF",
                  )
                }
              />

              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 hover:cursor-pointer text-white font-bold py-2 px-4 rounded"
              >
                Upload
              </button>
            </div>

            {uploadFileError && (
              <p className="text-red-400">{uploadFileError}</p>
            )}
          </form>
        </div>

        {transactions.length > 0 && (
          <div className="mt-4 w-full flex flex-col items-center justify-center">
            <ul className="space-y-2 w-full">
              {transactions.map((transaction, index) => (
                <li
                  key={index}
                  role="group"
                  aria-label={`Transaction ${index + 1}${editingIndex === index ? ", editing" : ", click to edit"}`}
                  tabIndex={0}
                  onClick={(event) => handleTransactionRowClick(event, index)}
                  onKeyDown={(event) =>
                    handleTransactionRowKeyDown(event, index)
                  }
                  className="flex space-x-2 justify-between items-center px-4 py-2 select-none bg-(--surface-variant) dark:bg-(--surface-variant-dark) ring-2 ring-transparent hover:ring-(--primary-dark) hover:cursor-pointer rounded-lg"
                >
                  <button
                    type="button"
                    aria-label={`Remove transaction ${index + 1}`}
                    className="text-red-400 hover:text-red-700 px-2"
                    onClick={() => removeTransaction(index)}
                  >
                    X
                  </button>
                  {editingIndex === index ? (
                    <>
                      <input
                        type="date"
                        aria-label="Transaction date"
                        value={editingTransaction?.date ?? ""}
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
                        value={editingTransaction?.description ?? ""}
                        onChange={(event) =>
                          updateEditingTransaction({
                            description: event.currentTarget.value,
                          })
                        }
                        className="grow min-w-0 px-2 py-1 border border-gray-300 dark:border-(--border-dark) rounded-md"
                      />
                      <select
                        aria-label="Transaction category"
                        value={editingTransaction?.category_id ?? ""}
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
                        {categories?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name} ({category.type})
                          </option>
                        ))}
                      </select>
                      <label className="flex-none">
                        <span className="sr-only">Transaction amount</span>
                        <input
                          type="number"
                          step="0.01"
                          aria-label="Transaction amount"
                          value={editingTransaction?.amount ?? ""}
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
                        className="text-green-300 px-2 hover:cursor-pointer"
                        onClick={handleDoneEditing}
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
                        {categories?.find(
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
            {errorMessage && (
              <p
                role="alert"
                className="mt-2 p-2 rounded-lg w-full bg-red-500 text-white"
              >
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-4 bg-(--primary-dark) hover:bg-(--primary-hover-dark) hover:cursor-pointer text-white font-bold py-2 px-4 rounded"
            >
              {isSubmitting ? "Submitting..." : "Submit All Transactions"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
