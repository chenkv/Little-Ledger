"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setFormMessage("Email and password are required");
      return;
    }

    setFormMessage(null);

    const res = await fetch("/api/user/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });

    if (!res.ok) {
      const payload = await res.json();

      console.error("Login failed:", payload?.error || payload?.message);

      setFormMessage("Login failed");
      return;
    }

    router.push("/home");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
  );
}
