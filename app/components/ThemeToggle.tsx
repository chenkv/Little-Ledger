"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-2 rounded-md text-xl
                 border border-[var(--border)] dark:border-[var(--border-dark)]
                 bg-[var(--card)] dark:bg-[var(--card-dark)]
                 text-[var(--text)] dark:text-[var(--text-dark)]
                 hover:bg-[var(--surface)] dark:hover:bg-[var(--surface-dark)]
                 transition"
    >
      {isDark ? "🌜" : "🌞"}
    </button>
  );
}
