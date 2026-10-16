import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { useState } from "react";
import { transactions_get, categories_get } from "@/types/api-res-types";
import TransactionsFilter, {
  type TransactionFilterValues,
} from "./TransactionsFilter";

type createAccountTransactionProps = {
  accountName: string;
  accountId: number | null;
};

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
  accountName,
  accountId,
}: createAccountTransactionProps) {
  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useSWRImmutable("/api/user/categories", fetcherCategories);

  const [searchPage, setSearchPage] = useState<number>(1);
  const [enableFilters, setEnableFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilterValues>({
    name: "",
    category: "",
    min_amount: "",
    max_amount: "",
    start_date: "",
    end_date: "",
  });

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
    return params.toString() ? `?${params.toString()}` : "";
  }

  const { data, error, isLoading } = useSWR(
    accountId === null ? null : `/api/user/transactions${queryParams()}`,
    fetcherAccount,
  );

  if (accountId === null) {
    return (
      <div className="p-6 bg-(--surface) dark:bg-(--surface-dark)">
        <h2 className="text-xl font-semibold mb-2">Transactions</h2>
        <p className="text-sm mb-4">Select an account to view transactions.</p>
      </div>
    );
  }

  console.log(data);
  console.log(categoriesData);

  return (
    <div className="p-6 bg-(--surface) dark:bg-(--surface-dark)">
      <div className="flex space-x-4 items-center mb-4">
        <h2 className="text-2xl font-semibold">
          Transactions for {accountName}
        </h2>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
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
          <ul className="space-y-2">
            {data.transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex justify-between items-center p-4 bg-(--surface-variant) dark:bg-(--surface-variant-dark) ring-2 ring-transparent hover:ring-(--primary-dark) hover:cursor-pointer rounded-lg"
              >
                <p className="flex-none w-30 font-medium">{transaction.date}</p>
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
              </li>
            ))}
          </ul>
        ) : (
          <p>No transactions found.</p>
        )}
      </div>
    </div>
  );
}
