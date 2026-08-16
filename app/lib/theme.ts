"use server";

import { cookies } from "next/headers";

export async function setTheme(theme: "light" | "dark") {
  const cookieStore = await cookies();

  cookieStore.set("theme", theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
