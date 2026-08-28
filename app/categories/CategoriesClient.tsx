"use client";

import useSWR from "swr";
import DashboardLayout from "../components/DashboardLayout";
import { categories_get } from "@/types/api-res-types";

async function fetcher(url: string): Promise<categories_get> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}

export default function CategoriesClient() {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/user/categories`,
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
      },
    ];

    try {
      const response = await fetch("/api/user/categories", {
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

      console.log(result);

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
        {data.categories.length != 0 ? (
          data.categories.map((a) => (
            <div
              key={a.id}
              className="flex justify-between py-3 border-b border-[var(--divider)] dark:border-[var(--divider-dark)] last:border-none"
            >
              <div>
                <p className="font-medium text-lg">{a.name}</p>
                <p className="text-sm">{a.type}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No Categories!</p>
        )}
      </section>
    );
  }

  return (
    <DashboardLayout
      content={
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>

          <div className="mt-6 flex space-x-4">
            {result}

            <div className="w-[30%]">
              <form
                onSubmit={handleSubmit}
                className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4"
              >
                <h2 className="text-xl font-semibold">
                  Create New Transaction Category
                </h2>

                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Category Name"
                  className="w-full px-3 py-2 rounded-md text-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                />

                <input
                  type="text"
                  name="type"
                  placeholder="Category Type"
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
