"use client";

import useSWR from "swr";
import DashboardLayout from "../components/DashboardLayout";
import { financial_account_get } from "@/types/api-res-types";

async function fetcher(url: string): Promise<financial_account_get[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch products");
  return response.json();
}

export default function AccountsClient() {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/user/financial-accounts`,
    fetcher,
  );

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = [
      {
        name: formData.get("name"),
        type: formData.get("type"),
        institution: formData.get("institution"),
        description: formData.get("description"),
      },
    ];

    try {
      const response = await fetch("/api/user/financial-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error);
      }

      const result = await response.json();

      console.log("Created account:", result);
      await mutate();

      // Optionally reset the form
      form.reset();
    } catch (error) {
      console.error(error);
    }
  }

  let result = null;
  if (isLoading) {
    result = (
      <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4 flex-1">
        Loading...
      </section>
    );
  } else if (error) {
    result = (
      <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4 flex-1">
        Error! Failed to load.
      </section>
    );
  } else {
    result = (
      <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4 flex-1">
        {data.accounts.length != 0 ? (
          data.accounts.map((a) => (
            <div
              key={a.id}
              className="flex justify-between py-3 border-b border-[var(--divider)] dark:border-[var(--divider-dark)] last:border-none"
            >
              <div>
                <p className="font-medium text-lg">{a.name}</p>
                <p className="text-sm">{a.description}</p>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                  {a.type} • {a.institution}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p>No Accounts!</p>
        )}
      </section>
    );
  }

  console.log(data);

  return (
    <DashboardLayout
      content={
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>

          <div className="mt-6 flex space-x-4">
            {result}

            <div className="w-[30%]">
              <form
                onSubmit={handleSubmit}
                className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4"
              >
                <h2 className="text-xl font-semibold">
                  Create New Financial Account
                </h2>

                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Account Name"
                  className="w-full px-3 py-2 rounded-md text-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                />

                <select
                  name="type"
                  required
                  className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                >
                  <option value="">Select a Account Type</option>
                  <option value="checking">Checking Account</option>
                  <option value="savings">Savings Account</option>
                  <option value="creditCard">Credit Card</option>
                </select>

                <select
                  name="institution"
                  required
                  className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                >
                  <option value="">Select an Institution</option>
                  <option value="chase">Chase</option>
                  <option value="american-express">American Express</option>
                  <option value="discover">Discover</option>
                </select>

                <input
                  type="text"
                  name="description"
                  placeholder="Account Description (Optional)"
                  required
                  className="w-full px-3 py-2 rounded-md text-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                />

                <button
                  type="submit"
                  className="w-full py-2 rounded-md font-medium text-white hover:cursor-pointer bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      }
    />
  );
}
