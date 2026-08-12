"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [loginTab, setLoginTab] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState<{ username: string; password: string }>({ username: "", password: "" });

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); // prevent page reload

    console.log(`Form submitted: ${loginTab}`);
    console.log("Username:", formData.username);
    console.log("Password:", formData.password);
  }

  return (
    <main
      className="
        min-h-screen flex items-center justify-center px-6
        bg-(--bg) text-(--text)
        dark:bg-(--bg-dark) dark:text-(--text-dark)
      "
    >
      <div
        className="
          w-full max-w-md p-8 rounded-xl shadow-md
          bg-(--surface) border border-(--border)
          dark:bg-(--surface-dark) dark:border-(--border-dark)
        "
      >
        <h1 className="text-3xl font-bold text-center mb-6">
          Welcome to LittleLedger
        </h1>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-(--divider) dark:border-(--divider-dark)">
          <button
            id="signin-tab"
            className={`
              flex-1 py-2 text-center font-medium
              text-(--text) hover:bg-(--card)
              dark:text-(--text-dark) dark:hover:bg-(--card-dark)
              transition
              ${loginTab === "login" ? "border-b-2 border-(--accent)" : ""}
            `}
            onClick={() => setLoginTab("login")}
          >
            Sign In
          </button>

          <button
            id="signup-tab"
            className={`
              flex-1 py-2 text-center font-medium
              text-(--text-secondary) dark:text-(--text-secondary-dark)
              hover:bg-(--card) dark:hover:bg-(--card-dark)
              transition
              ${loginTab === "register" ? "border-b-2 border-(--accent)" : ""}
            `}
            onClick={() => setLoginTab("register")}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        {loginTab === "login" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Username</label>
              <input
                type="text"
                className="
                  w-full px-3 py-2 rounded-md
                  bg-(--card) border border-(--border)
                  text-(--text)
                  dark:bg-(--card-dark) dark:border-(--border-dark) dark:text-(--text-dark)
                  focus:outline-none focus:ring-2 focus:ring-(--accent)
                "
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Password</label>
              <input
                type="password"
                className="
                  w-full px-3 py-2 rounded-md
                  bg-(--card) border border-(--border)
                  text-(--text)
                  dark:bg-(--card-dark) dark:border-(--border-dark) dark:text-(--text-dark)
                  focus:outline-none focus:ring-2 focus:ring-(--accent)
                "
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              className="
                w-full py-2 rounded-md font-medium text-white
                bg-(--primary) hover:bg-(--primary-hover)
                dark:bg-(--primary-dark) dark:hover:bg-(--primary-hover-dark)
                transition
              "
            >
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Username</label>
              <input
                type="text"
                className="
                  w-full px-3 py-2 rounded-md
                  bg-(--card) border border-(--border)
                  text-(--text)
                  dark:bg-(--card-dark) dark:border-(--border-dark) dark:text-(--text-dark)
                  focus:outline-none focus:ring-2 focus:ring-(--accent)
                "
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Password</label>
              <input
                type="password"
                className="
                  w-full px-3 py-2 rounded-md
                  bg-(--card) border border-(--border)
                  text-(--text)
                  dark:bg-(--card-dark) dark:border-(--border-dark) dark:text-(--text-dark)
                  focus:outline-none focus:ring-2 focus:ring-(--accent)
                "
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              className="
                w-full py-2 rounded-md font-medium text-white
                bg-(--primary) hover:bg-(--primary-hover)
                dark:bg-(--primary-dark) dark:hover:bg-(--primary-hover-dark)
                transition
              "
            >
              Create Account
            </button>
          </form>
        )}
      </div>
    </main>
  );
}