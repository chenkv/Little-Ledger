"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    currency: "USD",
    defaultBudget: "",
    autoCategorize: false,
    theme: "system",
  });

  // Load settings from cookies on mount
  useEffect(() => {
    const cookieMap = Object.fromEntries(
      document.cookie.split("; ").map((c) => c.split("="))
    );

    setSettings((prev) => ({
      currency: cookieMap.currency || prev.currency,
      defaultBudget: cookieMap.defaultBudget || prev.defaultBudget,
      autoCategorize: cookieMap.autoCategorize === "true",
      theme: cookieMap.theme || prev.theme,
    }));
  }, []);

  // Save settings to cookies
  function saveToCookies(updated: typeof settings) {
    Object.entries(updated).forEach(([key, value]) => {
      document.cookie = `${key}=${value}; path=/; max-age=31536000`; // 1 year
    });
  }

  function handleSave() {
    saveToCookies(settings);
    console.log("Settings saved:", settings);
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]">
    
      <Sidebar />
    
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-10">

          <h1 className="text-3xl font-bold">Settings</h1>

          <section className="p-6 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface-dark)] shadow space-y-6">
            <h2 className="text-xl font-semibold">Preferences</h2>

            {/* Currency */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Currency</label>
              <select
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={settings.currency}
                onChange={(e) =>
                  setSettings({ ...settings, currency: e.target.value })
                }
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            {/* Default Monthly Budget */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Default Monthly Budget</label>
              <input
                type="number"
                placeholder="e.g. 2000"
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={settings.defaultBudget}
                onChange={(e) =>
                  setSettings({ ...settings, defaultBudget: e.target.value })
                }
              />
            </div>

            {/* Auto Categorization */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoCategorize}
                onChange={(e) =>
                  setSettings({ ...settings, autoCategorize: e.target.checked })
                }
              />
              <label className="text-sm font-medium">
                Automatically categorize transactions
              </label>
            </div>

            {/* Theme */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Theme</label>
              <select
                className="w-full px-3 py-2 rounded-md bg-[var(--card)] dark:bg-[var(--card-dark)]"
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
              >
                <option value="system">System Default</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full py-2 rounded-md font-medium text-white bg-[var(--primary)] dark:bg-[var(--primary-dark)]"
            >
              Save Settings
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
