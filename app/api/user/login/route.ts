import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = db
      .query(
        "SELECT id, username, email, password_hash FROM users WHERE email = ?",
      )
      .get(email);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const {
      id,
      username,
      email: userEmail,
      password_hash: passwordHash,
    } = user;
    const isValid = await Bun.password.verify(password, passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const sessionToken = crypto.randomUUID();
    const sessionExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 2, // 2 hours
    ).toISOString();

    const result = db
      .query(
        "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
      )
      .run(id, sessionToken, sessionExpiresAt);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    const body = {
      message: "Login successful",
      user: { username, email: userEmail },
      session: {
        token: sessionToken,
        expiresAt: sessionExpiresAt,
      },
    };

    const res = NextResponse.json(body);
    res.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "test",
      sameSite: "lax",
      path: "/",
      expires: new Date(sessionExpiresAt),
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
