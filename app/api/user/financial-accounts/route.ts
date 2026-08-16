import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "../utils";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await req.json();
    if (!Array.isArray(accounts)) {
      return NextResponse.json(
        { error: "Request body must be an array of financial accounts" },
        { status: 400 },
      );
    }

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "Financial account list cannot be empty" },
        { status: 400 },
      );
    }

    const insertStmt = db.query(
      "INSERT INTO financial_accounts (user_id, name, type, institution, description) VALUES (?, ?, ?, ?, ?)",
    );

    db.run("BEGIN");
    const inserted = [];

    for (const account of accounts) {
      if (!account || typeof account !== "object") {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "Each financial account must be an object" },
          { status: 400 },
        );
      }

      const name = typeof account.name === "string" ? account.name.trim() : "";
      const type = typeof account.type === "string" ? account.type.trim() : "";
      const institution =
        typeof account.institution === "string"
          ? account.institution.trim()
          : "";
      const description =
        typeof account.description === "string"
          ? account.description.trim()
          : "";

      if (!name) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "name is required for each financial account" },
          { status: 400 },
        );
      }

      if (!type) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "type is required for each financial account" },
          { status: 400 },
        );
      }

      const result = insertStmt.run(
        userId,
        name,
        type,
        institution,
        description,
      );
      inserted.push({
        id: result.lastInsertRowid,
        name,
        type,
        institution,
        description,
      });
    }

    db.run("COMMIT");
    return NextResponse.json({ inserted }, { status: 201 });
  } catch (error) {
    console.error("Financial account insertion error:", error);
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

    const accounts = db
      .query(
        "SELECT id, name, type, institution, description FROM financial_accounts WHERE user_id = ?",
      )
      .all(userId);

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    console.error("Financial account retrieval error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
