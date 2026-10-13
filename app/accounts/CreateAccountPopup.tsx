"use client";

import { useState } from "react";

type CreateAccountPopupProps = {
  setAccountPopup: (value: boolean) => void;
  onAccountCreated: () => Promise<void>;
};

export default function CreateAccountPopup({
  setAccountPopup,
  onAccountCreated,
}: CreateAccountPopupProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create account.");
      }

      await onAccountCreated();
      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <button
        type="button"
        aria-label="Close create account form"
        className="absolute inset-0 bg-black/50"
        onClick={() => setAccountPopup(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
        className="relative bg-white dark:bg-(--popup-card-dark) p-6 rounded-lg shadow-lg z-10"
      >
        <h2 id="create-account-title" className="text-xl font-semibold mb-4">
          Create New Financial Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account Name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Account Name"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account Type
            </label>
            <select
              name="type"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            >
              <option value="">Select a Account Type</option>
              <option value="checking">Checking Account</option>
              <option value="savings">Savings Account</option>
              <option value="credit">Credit Card</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Institution
            </label>
            <select
              name="institution"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            >
              <option value="">Select an Institution</option>
              <option value="chase">Chase</option>
              <option value="american-express">American Express</option>
              <option value="discover">Discover</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description (Optional)
            </label>
            <input
              type="text"
              name="description"
              placeholder="Account Description (Optional)"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-(--border-dark) rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
            />
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-auto bg-(--primary-dark) hover:bg-(--primary-hover-dark) hover:cursor-pointer text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-(--primary-dark) focus:border-(--primary-dark)"
          >
            {isSubmitting ? "Creating..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
