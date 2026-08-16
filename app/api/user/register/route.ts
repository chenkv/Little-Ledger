import { NextResponse } from "next/server";
import { SignupFormSchema, prettifyError } from "@/app/lib/definitions";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    // Basic validation (return detailed field errors when validation fails)
    const validatedFields = SignupFormSchema.safeParse({
      username,
      email,
      password,
    });

    if (!validatedFields.success) {
      const prettyError = prettifyError(validatedFields);
      return NextResponse.json({ error: prettyError }, { status: 400 });
    }

    // Check if user already exists
    const existing = db.query("SELECT * FROM users WHERE email = ?").get(email);

    if (existing) {
      return NextResponse.json(
        { error: "User with that email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await Bun.password.hash(password);

    // Insert user
    const res = db
      .query(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      )
      .run(username || null, email, passwordHash);

    if (!res) {
      return NextResponse.json(
        { error: "Failed to register user" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 },
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
