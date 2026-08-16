"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function LoginPage() {
  const [loginTab, setLoginTab] = useState<"login" | "register">("login");

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
              hover:cursor-pointer
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
              hover:cursor-pointer
              transition
              ${loginTab === "register" ? "border-b-2 border-(--accent)" : ""}
            `}
            onClick={() => setLoginTab("register")}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        {loginTab === "login" ? <LoginForm /> : <RegisterForm />}
      </div>
    </main>
  );
}
