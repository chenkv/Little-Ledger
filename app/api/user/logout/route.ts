import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    let token: string | null = null;

    try {
      const cookieStore = cookies();
      token = cookieStore.get("session_token")?.value ?? null;
    } catch (e) {
      // cookies() may throw when called outside a Next request scope (tests).
      const header = req.headers.get("cookie") ?? "";
      const match = header.match(/(?:^|; )session_token=([^;]+)/);
      token = match ? decodeURIComponent(match[1]) : null;
    }

    if (token) {
      try {
        db.query("DELETE FROM sessions WHERE session_token = ?").run(token);
      } catch (err) {
        console.error("Failed to delete session during logout:", err);
        return NextResponse.json(
          { error: "Failed to log out" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "No session token found" },
        { status: 400 }
      );
    }

    const res = NextResponse.json({ message: "Logged out" }, { status: 200 });
    // Clear cookie on client by setting it expired
    res.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "test",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return res;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
