export default function AddTransactionsOverlay({
  transactions,
  updateTransactions,
  allCategories,
  allAccounts,
  setFormMessage,
}) {
  async function handleUploadTransactions(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const financialAccountId = Number(formData.get("account"));

    const transParsed = transactions.transactions.map((t, index) => {
      const categoryValue = formData.get(`category-${index}`);

      return {
        ...t,
        date: formatDateForInput(t.date),
        amount: parseFloat(String(t.amount)),
        financial_account_id: financialAccountId,
        category_id: categoryValue ? Number(categoryValue) : null,
      };
    });

    try {
      const request = await fetch("/api/user/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transParsed),
      });

      if (!request.ok) {
        const error = await request.json();

        setFormMessage("Failed to post transactions");
        console.error(error);
        return;
      }

      const response = await request.json();

      setFormMessage("Successfully posted all transactions!");
      console.log(response);

      updateTransactions({ transactions: [], financial_account: null });
    } catch (error) {
      console.error(error);
      setFormMessage("Failed to post transactions");
    }
  }

  function updateTransaction(
    index: number,
    field: keyof parsed_transaction_row,
    value: string,
  ) {
    const updatedTransactions = [...transactions.transactions];

    updatedTransactions[index] = {
      ...updatedTransactions[index],
      [field]: value,
    };

    updateTransactions({ ...transactions, transactions: updatedTransactions });
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

  if (transactions.transactions.length == 0) {
    return;
  }

  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen z-50 bg-black/50 flex justify-center overflow-y-scroll"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          updateTransactions({ transactions: [], financial_account: null });
        }
      }}
    >
      <section className="p-6 my-6 w-min h-fit rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] space-y-4 flex flex-col items-center">
        <h1 className="text-3xl font-bold">Transactions to Add</h1>

        <form onSubmit={handleUploadTransactions}>
          {transactions.transactions.map((tx, index) => (
            <div
              key={index}
              className="flex space-x-4 w-[80vw] justify-between py-3 border-b border-[var(--divider)] dark:border-[var(--divider-dark)] last:border-none"
            >
              <input
                type="date"
                defaultValue={formatDateForInput(tx.date)}
                onChange={(e) =>
                  updateTransaction(index, "date", e.target.value)
                }
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
              />

              <input
                type="text"
                defaultValue={tx.description}
                onChange={(e) =>
                  updateTransaction(index, "description", e.target.value)
                }
                className="flex-auto px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
              />

              <input
                type="number"
                defaultValue={Number(tx.amount)}
                onChange={(e) =>
                  updateTransaction(index, "amount", e.target.value)
                }
                step="0.01"
                min="0"
                className="px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
              />

              <select
                name={`category-${index}`}
                className="mt-2 px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
              >
                <option value={""}>No Category</option>
                {allCategories.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <p className="text-lg mt-4">Select Financial Account to Apply To</p>
          <select
            name="account"
            className="w-full mt-2 px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
          >
            <option value={transactions.financial_account.id}>
              {transactions.financial_account.name}
            </option>
            {allAccounts.map((e) =>
              transactions.financial_account.id == e.id ? null : (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ),
            )}
          </select>

          <button
            type="submit"
            className="w-full mt-4 py-2 rounded-md font-medium text-white hover:cursor-pointer bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
          >
            Add Transactions
          </button>
        </form>
      </section>
    </div>
  );
}
