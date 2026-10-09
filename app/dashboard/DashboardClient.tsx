"use client";

import useSWR from "swr";

async function fetcher(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
}

export default function DashboardClient() {
  const {
    data: transactions,
    error: transactionsError,
    isLoading: transactionsLoading,
  } = useSWR(
    `/api/user/dashboard/monthly-breakdown?month=${new Date().toISOString().slice(0, 7)}`,
    fetcher,
  );

  if (transactionsLoading) {
    return <div>Loading</div>;
  }

  if (transactionsError) {
    return <div>Error!</div>;
  }

  console.log(transactions);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Monthly Summary */}
      <div className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow">
        <h2 className="text-xl font-semibold mb-2">This Month</h2>
        <p className="text-sm mb-4">
          Spent: $
          {transactions.transactions
            .reduce(
              (total: number, tx) => total + (tx.amount > 0 ? tx.amount : 0),
              0,
            )
            .toFixed(2)}
        </p>
      </div>

      {/* Recent Transactions */}
      <div className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow">
        <h2 className="text-xl font-semibold mb-2">Recent Transactions</h2>
        <p className="text-sm mb-4">Here are your latest transactions.</p>

        <div className="space-y-4">
          {transactions.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex justify-between items-center p-4 bg-[var(--surface-variant)] dark:bg-[var(--surface-variant-dark)] rounded-lg shadow"
            >
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-[var(--on-surface-variant)] dark:text-[var(--on-surface-variant-dark)]">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <div
                className={`font-semibold ${transaction.amount > 0 ? "text-red-500" : "text-green-500"}`}
              >
                {transaction.amount > 0 ? "-" : "+"}$
                {Math.abs(transaction.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
