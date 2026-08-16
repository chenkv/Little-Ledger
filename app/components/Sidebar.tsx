"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (res.ok) {
        router.push("/");
      } else {
        console.error("Logout failed", await res.text());
        setLoading(false);
      }
    } catch (err) {
      console.error("Logout error", err);
      setLoading(false);
    }
  }

  return (
    <aside className="w-64 p-6 border-r border-[var(--divider)] dark:border-[var(--divider-dark)] bg-[var(--surface)] dark:bg-[var(--surface-dark)] flex flex-col">
      <nav className="space-y-3">
        <Link className="block px-3 py-2 rounded-md hover:bg-[var(--card)] dark:hover:bg-[var(--card-dark)] cursor-pointer"
          href="/home">
          Dashboard
        </Link>
        <Link className="block px-3 py-2 rounded-md hover:bg-[var(--card)] dark:hover:bg-[var(--card-dark)] cursor-pointer"
          href="/transactions">
          Transactions
        </Link>
        <Link className="block px-3 py-2 rounded-md hover:bg-[var(--card)] dark:hover:bg-[var(--card-dark)] cursor-pointer"
          href="/categories">
          Categories
        </Link>
        <Link className="block px-3 py-2 rounded-md hover:bg-[var(--card)] dark:hover:bg-[var(--card-dark)] cursor-pointer"
          href="/settings">
          Settings
        </Link>
      </nav>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--card)] dark:hover:bg-[var(--card-dark)] bg-transparent"
        >
          {loading ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}