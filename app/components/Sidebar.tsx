"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 p-6 border-r border-[var(--divider)] dark:border-[var(--divider-dark)] bg-[var(--surface)] dark:bg-[var(--surface-dark)]">
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
    </aside>
  );
}