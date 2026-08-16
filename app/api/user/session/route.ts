import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserIdFromRequest } from "../utils";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = db.query("SELECT id, username, email FROM users WHERE id = ?").get(userId);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

    