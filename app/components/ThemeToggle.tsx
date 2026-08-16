"use client";

import { useTheme } from "@/app/lib/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-2 rounded-md text-xl
                 border border-(--border) dark:border-(--border-dark)
                 bg-(--card) dark:bg-(--card-dark)
                 text-(--text) dark:text-(--text-dark)
                 hover:bg-(--surface) dark:hover:bg-(--surface-dark)
                 transition"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
