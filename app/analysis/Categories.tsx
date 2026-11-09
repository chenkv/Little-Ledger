import useSWR from "swr";
import { categories_get, categories_insights } from "@/types/api-res-types";
import EditCategoryPopup from "./_components/EditCategoryPopup";
import { useState } from "react";

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default function Categories() {
  // TODO: Handle error and isloading states
  const { data, error, isLoading, mutate } = useSWR(
    "/api/user/categories",
    fetcher<categories_get>,
  );
  const {
    data: insightsData,
    error: insightsError,
    isLoading: insightsLoading,
    mutate: mutateInsights,
  } = useSWR("/api/user/insights/categories", fetcher<categories_insights>);

  const [isCategoryPopupOpen, setIsCategoryPopupOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    categories_get["categories"][0] | null
  >(null);

  const [curEditingCommonTransaction, setCurEditingCommonTransaction] =
    useState<
      categories_insights["recommended_transactions_to_categorize"][0] | null
    >(null);
  const [exitingCommonTransactions, setExitingCommonTransactions] = useState<
    Record<string, boolean>
  >({});
  const [commonTransactionCategoryError, setCommonTransactionCategoryError] =
    useState<string>("");

  const [exitingLatestTransactions, setExitingLatestTransactions] = useState<
    Record<string, boolean>
  >({});
  const [latestTransactionCategoryErrors, setLatestTransactionCategoryErrors] =
    useState<Record<string, string>>({});

  async function handleSaveCommonTransaction(
    e: React.SubmitEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    const form = e.currentTarget;

    if (!form.reportValidity() || !data || !insightsData) {
      return;
    }

    const formData = new FormData(form);

    const regexRule = formData.get("matchRules");
    const categoryId = formData.get("categoryId");
    const transactionIndex = e.target.dataset.transactionIndex;

    const categoryRegex = data.categories.filter(
      (cat) => cat.id === Number(categoryId),
    )[0]?.match_rules;
    let newRegex = "";
    if (categoryRegex) {
      newRegex = categoryRegex + "\n" + regexRule;
    } else {
      newRegex = String(regexRule);
    }

    try {
      const response = await fetch("/api/user/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(categoryId),
          match_rules: newRegex,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setCommonTransactionCategoryError(
          result.error ? result.error : "Failed to update category.",
        );
        return;
      }

      // Trigger fade-out animation
      setExitingCommonTransactions((prev) => ({
        ...prev,
        [insightsData.recommended_transactions_to_categorize[
          Number(transactionIndex)
        ].description]: true,
      }));

      // Remove from SWR cache after animation
      setTimeout(async () => {
        await mutateInsights(
          (currentData) => {
            if (!currentData) return currentData;

            return {
              ...currentData,
              recommended_transactions_to_categorize:
                currentData.recommended_transactions_to_categorize.filter(
                  (_, index) => index !== Number(transactionIndex),
                ),
            } as categories_insights;
          },
          { revalidate: false },
        );
        await mutate();

        setExitingCommonTransactions((prev) => {
          const updated = { ...prev };
          delete updated[
            insightsData.recommended_transactions_to_categorize[
              Number(transactionIndex)
            ].description
          ];
          return updated;
        });

        setCurEditingCommonTransaction(null);
      }, 300);
    } catch (updateError) {
      setCommonTransactionCategoryError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update category.",
      );
    }
  }

  async function handleSelectLatestCategory(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const selectedValue = event.target.value;
    const transactionId = event.target.parentElement?.dataset.transactionId;

    if (!transactionId) return;

    setLatestTransactionCategoryErrors((prev) => ({
      ...prev,
      [transactionId]: "",
    }));

    try {
      const response = await fetch("/api/user/transactions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(transactionId),
          category_id: Number(selectedValue),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setLatestTransactionCategoryErrors((prev) => ({
          ...prev,
          [transactionId]: result.error
            ? result.error
            : "Failed to update transaction.",
        }));
        return;
      }

      // Trigger fade-out animation
      setExitingLatestTransactions((prev) => ({
        ...prev,
        [transactionId]: true,
      }));

      // Remove from SWR cache after animation
      setTimeout(async () => {
        await mutateInsights((currentData) => {
          if (!currentData) return currentData;

          return {
            ...currentData,
            latest_transactions_to_categorize:
              currentData.latest_transactions_to_categorize.filter(
                (
                  transaction: categories_insights["latest_transactions_to_categorize"][0],
                ) =>
                  String(transaction.transaction_id) !== String(transactionId),
              ),
          } as categories_insights;
        });

        setExitingLatestTransactions((prev) => {
          const updated = { ...prev };
          delete updated[transactionId];
          return updated;
        });
      }, 300);
    } catch (updateError) {
      setLatestTransactionCategoryErrors((prev) => ({
        ...prev,
        [transactionId]:
          updateError instanceof Error
            ? updateError.message
            : "Failed to update transaction.",
      }));
    }
  }

  return (
    <div className="flex-1 mt-6 px-2 rounded-tr-3xl bg-(--surface-dark)">
      <h2 className="text-2xl text-left p-4">Categorize your transactions</h2>

      <div className="flex flex-col space-y-4">
        <div className="p-4 border-b border-gray-300 dark:border-(--border-dark)">
          <h3 className="text-left text-xl">All categories</h3>
          <p className="text-left mb-4 text-sm text-gray-500 dark:text-gray-400">
            Note that if matching rules apply to multiple categories, it will
            prioritize your oldest category.
          </p>
          {error && (
            <p className="text-red-500 dark:text-red-400">
              Error fetching categories.
            </p>
          )}
          {isLoading && (
            <p className="text-gray-500 dark:text-gray-400">
              Loading categories...
            </p>
          )}
          <div className="grid grid-cols-4 gap-4">
            {data &&
              data.categories.map((category) => (
                <button
                  key={category.id + "-all"}
                  onClick={() => {
                    setEditingCategory(category);
                    setIsCategoryPopupOpen(true);
                  }}
                  className="flex items-center px-4 py-2 rounded-lg bg-(--card) dark:bg-(--card-dark) hover:bg-(--card-hover) dark:hover:bg-(--card-hover-dark) hover:cursor-pointer select-none"
                >
                  <h3 className="grow text-left text-lg font-bold">
                    {category.name}
                  </h3>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              ))}
            <button
              key="new"
              className="p-2 rounded-lg border border-(--card-dark) hover:bg-(--card-dark) dark:hover:bg-(--card-hover-dark) dark:border-(--border-dark) hover:cursor-pointer select-none"
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryPopupOpen(true);
              }}
            >
              <h3 className="text-lg font-bold">New Category</h3>
            </button>
          </div>

          {isCategoryPopupOpen && (
            <EditCategoryPopup
              editingCategory={editingCategory}
              setCategoryPopup={setIsCategoryPopupOpen}
              onCategoryCreated={async () => {
                setIsCategoryPopupOpen(false);
                await mutate();
                await mutateInsights();
              }}
            />
          )}
        </div>

        <div className="p-4 border-b border-gray-300 dark:border-(--border-dark)">
          <h3 className="text-left text-xl">
            Set Category Rules for Common Transactions
          </h3>
          <p className="mb-4 text-left text-gray-600 dark:text-gray-400">
            Category matching rules are comma-separated lists of substrings to
            match on.
          </p>
          {insightsError && (
            <p className="text-red-500 dark:text-red-400">
              Error fetching insights.
            </p>
          )}
          {insightsLoading && (
            <p className="text-gray-500 dark:text-gray-400">
              Loading insights...
            </p>
          )}
          <div className="h-[40vh] overflow-y-auto rounded-xl">
            {insightsData &&
            insightsData.recommended_transactions_to_categorize.length > 0 ? (
              insightsData.recommended_transactions_to_categorize.map(
                (
                  transaction: categories_insights["recommended_transactions_to_categorize"][0],
                  index: number,
                ) => (
                  <div
                    key={transaction.description + "-common"}
                    className={`flex items-center p-2 border-b border-gray-300 bg-(--card) dark:bg-(--card-dark)
                    dark:border-(--border-dark) hover:bg-(--card-hover) dark:hover:bg-(--card-hover-dark)
                    transition-all duration-300 ease-in-out
                    ${
                      exitingCommonTransactions[transaction.description]
                        ? "opacity-0 scale-95 translate-y-2 pointer-events-none"
                        : ""
                    }
                  `}
                    onClick={() => {
                      setCurEditingCommonTransaction(transaction);
                    }}
                  >
                    {curEditingCommonTransaction?.description ===
                    transaction.description ? (
                      <form
                        data-transaction-index={index}
                        className="w-full flex space-x-2 items-center"
                        onSubmit={handleSaveCommonTransaction}
                      >
                        <select
                          className="p-2 rounded-lg border border-gray-300 dark:border-(--border-dark) dark:bg-(--card-dark)"
                          required
                          name="categoryId"
                          onChange={handleSelectLatestCategory}
                        >
                          <option value="">Select Category</option>
                          {data &&
                            data.categories.map((category) => (
                              <option
                                key={category.id + "-latest"}
                                value={category.id}
                              >
                                {category.name}
                              </option>
                            ))}
                        </select>
                        <div className="grow flex items-center space-x-2">
                          <label className="sr-only">Regex:</label>
                          <input
                            type="text"
                            name="matchRules"
                            required
                            defaultValue={transaction.description}
                            placeholder="Enter list of substrings to match on"
                            className="grow p-2 rounded-lg border border-gray-300 dark:border-(--border-dark) dark:bg-(--card-dark)"
                          ></input>
                        </div>
                        <button
                          type="submit"
                          className="hover:cursor-pointer bg-blue-500 text-white p-2 rounded"
                        >
                          Add
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between w-full hover:cursor-pointer">
                        <div className="grow text-left">
                          <p className="text-lg">{transaction.description}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Account: {transaction.financial_account_name}
                          </p>
                        </div>
                        <p className="text-lg font-bold">
                          {String(transaction.occurrence_count)} occurrences
                        </p>
                      </div>
                    )}
                  </div>
                ),
              )
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No common transactions to categorize.
              </p>
            )}
          </div>
          <p className="text-red-500 dark:text-red-400">
            {commonTransactionCategoryError}
          </p>
        </div>

        <div className="p-4 border-b border-gray-300 dark:border-(--border-dark)">
          <h3 className="text-left text-xl mb-2">
            Categorize Latest Transactions
          </h3>
          {insightsError && (
            <p className="text-red-500 dark:text-red-400">
              Error fetching insights.
            </p>
          )}
          {insightsLoading && (
            <p className="text-gray-500 dark:text-gray-400">
              Loading insights...
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 overflow-y-auto">
            {insightsData &&
            insightsData.latest_transactions_to_categorize.length > 0 ? (
              insightsData.latest_transactions_to_categorize.map(
                (
                  transaction: categories_insights["latest_transactions_to_categorize"][0],
                  index: number,
                ) => {
                  const transactionAmount =
                    "transaction_amount" in transaction
                      ? Number(transaction.transaction_amount)
                      : 0;

                  if (index > 19) return;

                  return (
                    <div
                      key={transaction.transaction_id + "-latest"}
                      data-transaction-id={transaction.transaction_id}
                      className={`flex flex-col items-center rounded-lg p-2 border border-gray-300
                    dark:border-(--border-dark) hover:bg-(--card-hover) dark:hover:bg-(--card-hover-dark)
                    transition-all duration-300 ease-in-out
                    ${
                      exitingLatestTransactions[
                        String(transaction.transaction_id)
                      ]
                        ? "opacity-0 scale-95 translate-y-2 pointer-events-none"
                        : ""
                    }`}
                    >
                      <p className="text-lg">{transaction.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.financial_account_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {transactionAmount < 0 ? "-" : ""}$
                        {Math.abs(transactionAmount)} •{" "}
                        {transaction.transaction_date}
                      </p>
                      <select
                        className="mt-4 p-2 border border-gray-300 dark:border-(--border-dark) dark:bg-(--card-dark)"
                        onChange={handleSelectLatestCategory}
                      >
                        <option value="">Select Category</option>
                        {data &&
                          data.categories.map((category) => (
                            <option
                              key={category.id + "-latest"}
                              value={category.id}
                            >
                              {category.name}
                            </option>
                          ))}
                      </select>
                      {latestTransactionCategoryErrors[
                        String(transaction.transaction_id)
                      ] && (
                        <p className="text-red-500 dark:text-red-400">
                          {
                            latestTransactionCategoryErrors[
                              String(transaction.transaction_id)
                            ]
                          }
                        </p>
                      )}
                    </div>
                  );
                },
              )
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No latest transactions to categorize.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
