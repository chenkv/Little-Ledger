"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignupFormSchema, prettifyError } from '@/app/lib/definitions'

export default function LoginPage() {
  const [loginTab, setLoginTab] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState<{ username: string; email: string; password: string }>({ username: "", email: "", password: "" });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormMessage(null); // Clear form message when switching tabs
    setFormData({ username: "", email: "", password: "" }); // Clear form data when switching tabs
  }, [loginTab]);

  const router = useRouter();

  async function handleLoginSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); // prevent page reload

    if (!formData.email || !formData.password) {
      setFormMessage("Email and password are required");
      return;
    }

    setFormMessage(null);

    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      let payload: any = null;
      try { payload = await res.json(); } catch (_) { payload = null; }

      if (res.ok) {
        
        router.push("/home");
      } else {
        setFormMessage(payload?.error || payload?.message || "Login failed");
      }
    } catch (err) {
      setFormMessage("Network error");
    }
  }

  async function handleRegisterSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); // prevent page reload

    if (!formData.email || !formData.username || !formData.password) {
      setFormMessage("All fields are required");
      return;
    }

    const validatedFields = SignupFormSchema.safeParse({
      username: formData.username,
      email: formData.email,
      password: formData.password,
    })
  
    // If any form fields are invalid, return early
    if (!validatedFields.success) {
      setFormMessage(prettifyError(validatedFields));
      return;
    }

    setFormMessage(null);

    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: formData.username, email: formData.email, password: formData.password }),
      });

      let payload: any = null;
      try { payload = await res.json(); } catch (_) { payload = null; }

      if (res.ok) {
        router.push("/home");
      } else {
        setFormMessage(payload?.error || payload?.message || "Registration failed");
      }
    } catch (err) {
      setFormMessage("Network error");
    }
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
        {loginTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm">Email</label>
              <input
                type="email"
                className="
                  w-full px-3 py-2 rounded-md
                  bg-(--card) border border-(--border)
                  text-(--text)
                  dark:bg-(--card-dark) dark:border-(--border-dark) dark:text-(--text-dark)
                  focus:outline-none focus:ring-2 focus:ring-(--accent)
                "
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
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

            {formMessage && (
              <div className="text-center text-sm text-(--text-danger) dark:text-(--text-danger-dark) whitespace-pre-wrap">
                {formMessage}
              </div>
            )}

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
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
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
              <label className="block mb-1 text-sm">Email</label>
              <input
                type="email"
                className="
                  w-full px-3 py-2 rounded-md
                  bg-(--card) border border-(--border)
                  text-(--text)
                  dark:bg-(--card-dark) dark:border-(--border-dark) dark:text-(--text-dark)
                  focus:outline-none focus:ring-2 focus:ring-(--accent)
                "
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
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

            {formMessage && (
              <div className="text-center text-sm text-(--text-danger) dark:text-(--text-danger-dark) whitespace-pre-wrap">
                {formMessage}
              </div>
            )}

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