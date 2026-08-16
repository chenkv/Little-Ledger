"use client";

import { useState } from "react";
import { SignupFormSchema, prettifyError } from "@/app/lib/definitions";

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.email || !formData.username || !formData.password) {
      setFormMessage("All fields are required");
      return;
    }

    const validatedFields = SignupFormSchema.safeParse({
      username: formData.username,
      email: formData.email,
      password: formData.password,
    });

    if (!validatedFields.success) {
      setFormMessage(prettifyError(validatedFields));
      return;
    }

    setFormMessage(null);

    const res = await fetch("/api/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      }),
    });

    if (!res.ok) {
      const payload = await res.json();
      console.error("Registration failed:", payload?.error || payload?.message);
      setFormMessage(
        payload?.error || payload?.message || "Registration failed",
      );
      return;
    }

    setFormMessage("Registration successful! You can now log in.");
  }

  return (
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
        Create Account
      </button>
    </form>
  );
}
