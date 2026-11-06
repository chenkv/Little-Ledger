"use client";

import { categories_get } from "@/types/api-res-types";
import { useState } from "react";

type CreateCategoryPopupProps = {
  editingCategory: categories_get["categories"][0] | null;
  setCategoryPopup: (value: boolean) => void;
  onCategoryCreated: () => Promise<void>;
};

export default function CreateCategoryPopup({
  editingCategory,
  setCategoryPopup,
  onCategoryCreated,
}: CreateCategoryPopupProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      name: formData.get("name"),
      match_rules: formData.get("matchRules"),
    };

    if (!editingCategory) {
      try {
        const response = await fetch("/api/user/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([data]),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Failed to create category.");
        }

        await onCategoryCreated();
        form.reset();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to create category.",
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const updateData = { ...data, id: editingCategory.id };
        const response = await fetch("/api/user/categories", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Failed to update category.");
        }

        await onCategoryCreated();
        form.reset();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update category.",
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!editingCategory) return;

    if (e.currentTarget.textContent === "Are you sure?") {
      try {
        const response = await fetch(`/api/user/categories`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([editingCategory.id]),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Failed to delete category.");
        }

        await onCategoryCreated();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to delete category.",
        );
      }
    } else {
      e.currentTarget.textContent = "Are you sure?";
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <button
        type="button"
        aria-label="Close create category form"
        className="absolute inset-0 bg-black/50"
        onClick={() => setCategoryPopup(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-category-title"
        className="relative w-[40vw] bg-white dark:bg-(--popup-card-dark) p-6 rounded-lg shadow-lg z-10"
      >
        <h2 id="create-category-title" className="text-xl font-semibold mb-4">
          {editingCategory ? "Edit Category" : "Create New Category"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
              Category Name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Category Name"
              defaultValue={editingCategory?.name || ""}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            />
          </div>
          <div className="mb-4">
            <label className="block text-left text-sm font-medium text-gray-700 dark:text-gray-300">
              Category Match Rules
            </label>
            <textarea
              name="matchRules"
              placeholder="Regex rules to match transactions, separate by new line"
              defaultValue={editingCategory?.match_rules || ""}
              className="mt-1 block w-full h-[20vh] px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark) resize-y"
            />
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errorMessage ?? "Failed to fetch financial institutions."}
            </p>
          )}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(errorMessage)}
              className="w-full py-2 px-auto bg-(--primary-dark) hover:bg-(--primary-hover-dark) hover:cursor-pointer text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            >
              {isSubmitting ? "Creating..." : "Submit"}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full py-2 px-auto bg-red-500 hover:bg-red-600 hover:cursor-pointer text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                Delete Category
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
