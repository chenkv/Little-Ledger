import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "../utils";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await req.json();
    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Request body must be an array of categories" },
        { status: 400 },
      );
    }

    if (categories.length === 0) {
      return NextResponse.json(
        { error: "Category list cannot be empty" },
        { status: 400 },
      );
    }

    const insertStmt = db.query(
      "INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)",
    );

    db.run("BEGIN");
    const inserted = [];

    for (const category of categories) {
      if (!category || typeof category !== "object") {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "Each category must be an object" },
          { status: 400 },
        );
      }

      const name =
        typeof category.name === "string" ? category.name.trim() : "";
      const type =
        typeof category.type === "string" ? category.type.trim() : "";

      if (!name || !type) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "name and type are required for each category" },
          { status: 400 },
        );
      }

      const result = insertStmt.run(userId, name, type);
      inserted.push({ id: result.lastInsertRowid, name, type });
    }

    db.run("COMMIT");
    return NextResponse.json({ inserted }, { status: 201 });
  } catch (error) {
    console.error("Category insertion error:", error);
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      console.warn("Rollback failed:", rollbackError);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = db
      .query("SELECT id, name, type FROM categories WHERE user_id = ?")
      .all(userId);

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Category retrieval error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
