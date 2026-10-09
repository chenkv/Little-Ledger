"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (res.ok) {
        window.location.assign("/");
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
    <button
      className="px-3 py-2 rounded-md hover:bg-(--card) dark:hover:bg-(--card-dark) cursor-pointer"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
