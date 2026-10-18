"use client";

import { useState, type FormEvent } from "react";

export type TransactionFilterValues = {
  name: string;
  category: string;
  min_amount: string;
  max_amount: string;
  start_date: string;
  end_date: string;
};

type TransactionCategory = {
  id: number;
  name: string;
  type: string;
};

type TransactionsFilterProps = {
  categories: TransactionCategory[];
  enabled: boolean;
  onApplyFilters: (filters: TransactionFilterValues) => void;
};

const emptyFilters: TransactionFilterValues = {
  name: "",
  category: "",
  min_amount: "",
  max_amount: "",
  start_date: "",
  end_date: "",
};

export default function TransactionsFilter({
  categories,
  enabled,
  onApplyFilters,
}: TransactionsFilterProps) {
  const [filters, setFilters] = useState<TransactionFilterValues>(emptyFilters);

  function updateFilter(key: keyof TransactionFilterValues, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApplyFilters(filters);
  }

  return (
    <div
      id="transaction-filters"
      aria-hidden={!enabled}
      inert={!enabled}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
        enabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <form className="flex space-x-2" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            value={filters.name}
            onChange={(event) =>
              updateFilter("name", event.currentTarget.value)
            }
            placeholder="Transaction Name"
            className="px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          />
          <select
            name="category"
            value={filters.category}
            onChange={(event) =>
              updateFilter("category", event.currentTarget.value)
            }
            className="px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          >
            <option value="">Spending Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="min_amount"
            value={filters.min_amount}
            onChange={(event) =>
              updateFilter("min_amount", event.currentTarget.value)
            }
            placeholder="Min Amount"
            className="px-3 py-2 w-32 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          />
          <input
            type="number"
            name="max_amount"
            value={filters.max_amount}
            onChange={(event) =>
              updateFilter("max_amount", event.currentTarget.value)
            }
            placeholder="Max Amount"
            className="px-3 py-2 w-32 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          />
          <input
            type="date"
            name="start_date"
            value={filters.start_date}
            onChange={(event) =>
              updateFilter("start_date", event.currentTarget.value)
            }
            placeholder="Start Date"
            className="px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          />
          <input
            type="date"
            name="end_date"
            value={filters.end_date}
            onChange={(event) =>
              updateFilter("end_date", event.currentTarget.value)
            }
            placeholder="End Date"
            className="px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          />
          <button
            type="submit"
            className="bg-(--primary-dark) hover:bg-(--primary-hover-dark) text-white font-bold py-2 px-4 rounded"
          >
            Apply Filters
          </button>
        </form>
      </div>
    </div>
  );
}
