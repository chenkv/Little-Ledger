import useSWR from "swr";
import { useState } from "react";

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
};

async function fetcher(
  url: string,
): Promise<{ accounts: financial_account_get[] }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch summary data.");
  return response.json();
}

function SummaryCard({ title, value, description }: SummaryCardProps) {
  return (
    <div className="min-w-0 rounded-4xl border border-(--border) bg-(--surface) p-6 pb-8 text-left dark:border-(--border-dark) first:bg-transparent not-first:dark:bg-(--bg-dark)">
      <div className="text-(--text-muted) dark:text-(--text-muted-dark)">
        {title}
      </div>
      <div className="mt-2 text-2xl text-(--text) dark:text-(--text-dark)">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-(--text-secondary) dark:text-(--text-secondary-dark)">
        {description}
      </div>
    </div>
  );
}

export default function MonthlySummary() {
  const [month, setMonth] = useState(() => {
    const currentDate = new Date();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");

    return `${currentDate.getFullYear()}-${currentMonth}`;
  });

  function changeMonth(offset: number) {
    const [year, currentMonth] = month.split("-").map(Number);
    const nextDate = new Date(year, currentMonth - 1 + offset, 1);
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");

    setMonth(`${nextDate.getFullYear()}-${nextMonth}`);
  }

  const { data, error, isLoading } = useSWR(
    `/api/user/insights/monthly-breakdown?month=${month}`,
    fetcher,
  );

  if (isLoading || error) {
  } else {
    console.log(data);
  }

  return (
    <div className="border-b-2 border-(--border) dark:border-(--border-dark) last:border-none">
      <div className="flex gap-2 py-2">
        <button
          type="button"
          className="w-8 h-8 hover:cursor-pointer"
          aria-label="Previous month"
          onClick={() => changeMonth(-1)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <input
          type="month"
          aria-label="Select month and year"
          className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-(--text) dark:border-(--border-dark) dark:bg-(--card-dark) dark:text-(--text-dark)"
          value={month}
          onChange={(event) => {
            if (event.target.value) setMonth(event.target.value);
          }}
        />

        <button
          type="button"
          className="w-8 h-8 hover:cursor-pointer"
          aria-label="Next month"
          onClick={() => changeMonth(1)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* TODO: Dynamically pull data from API */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total spent"
          value="$2,123.43"
          description="Maybe some insight here"
        />
        <SummaryCard
          title="Income"
          value="$2,123.43"
          description="This month"
        />
        <SummaryCard
          title="Net Cash Flow"
          value="$2,123.43"
          description="Income minus expenses"
        />
        <SummaryCard
          title="Daily Average"
          value="$2,123.43"
          description="Spending per day"
        />
      </div>
    </div>
  );
}
