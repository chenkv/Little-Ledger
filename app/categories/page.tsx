"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";

type Category = {
  id: number;
  name: string;
  budget: number;
};

const initialCategories: Category[] = [
  { id: 1, name: "Groceries", budget: 500 },
  { id: 2, name: "Eating Out", budget: 300 },
  { id: 3, name: "Transportation", budget: 200 },
  { id: 4, name: "Entertainment", budget: 250 },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories);

  const [newCategory, setNewCategory] = useState({
    name: "",
    budget: "",
  });

  const [editing, setEditing] = useState<Category | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const newCat: Category = {
      id: Date.now(),
      name: newCategory.name,
      budget: Number(newCategory.budget),
    };

    setCategories([...categories, newCat]);
    setNewCategory({ name: "", budget: "" });
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    setCategories(
      categories.map((c) =>
        c.id === editing.id ? editing : c
      )
    );

    setEditing(null);
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]">
      <Sidebar />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-10">

          {/* Page Title */}
          <h1 className="text-3xl font-bold">Categories</h1>

          {/* Add Category */}
          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Add Category</h2>

            <form onSubmit={handleAdd} className="space-y-4">
              <input
                type="text"
                placeholder="Category Name"
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Monthly Budget"
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={newCategory.budget}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, budget: e.target.value })
                }
              />

              <button
                type="submit"
                className="w-full py-2 rounded-md font-medium text-white bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
              >
                Add Category
              </button>
            </form>
          </section>

          {/* Category List */}
          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
            <h2 className="text-xl font-semibold">Your Categories</h2>

            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex justify-between items-center py-3 border-b border-[var(--divider)] dark:border-[var(--divider-dark)] last:border-none"
              >
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                    Budget: ${cat.budget}
                  </p>
                </div>

                <button
                  onClick={() => setEditing(cat)}
                  className="px-3 py-1 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)] hover:bg-[var(--divider)] dark:hover:bg-[var(--divider-dark)] transition"
                >
                  Edit
                </button>
              </div>
            ))}

            {categories.length === 0 && (
              <p className="text-center text-[var(--text-muted)] dark:text-[var(--text-muted-dark)]">
                No categories yet.
              </p>
            )}
          </section>

          {/* Edit Category Modal */}
          {editing && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
              <div className="w-full max-w-md p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-4">
                <h2 className="text-xl font-semibold">Edit Category</h2>

                <form onSubmit={handleEditSave} className="space-y-4">
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />

                  <input
                    type="number"
                    className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    value={editing.budget}
                    onChange={(e) =>
                      setEditing({ ...editing, budget: Number(e.target.value) })
                    }
                  />

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-md font-medium text-white bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="flex-1 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
