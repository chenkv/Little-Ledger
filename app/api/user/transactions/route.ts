import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "../utils";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await req.json();
    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Request body must be an array of transactions" },
        { status: 400 },
      );
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "Transaction list cannot be empty" },
        { status: 400 },
      );
    }

    const insertStmt = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );

    db.run("BEGIN");
    const inserted = [];

    for (const transaction of transactions) {
      if (!transaction || typeof transaction !== "object") {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "Each transaction must be an object" },
          { status: 400 },
        );
      }

      const financialAccountId = Number(transaction.financial_account_id);
      const date =
        typeof transaction.date === "string" ? transaction.date.trim() : "";
      const description =
        typeof transaction.description === "string"
          ? transaction.description.trim()
          : null;
      const amount = Number(transaction.amount);
      const categoryId =
        transaction.category_id == null
          ? null
          : Number(transaction.category_id);

      if (!Number.isInteger(financialAccountId) || financialAccountId <= 0) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "financial_account_id must be a positive integer" },
          { status: 400 },
        );
      }

      if (!date) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "date is required for each transaction" },
          { status: 400 },
        );
      }

      if (!Number.isFinite(amount)) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "amount must be a valid number" },
          { status: 400 },
        );
      }

      const result = insertStmt.run(
        financialAccountId,
        date,
        description,
        amount,
        categoryId,
      );

      if (!result) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "Failed to insert transaction" },
          { status: 500 },
        );
      }

      inserted.push({
        id: result.lastInsertRowid,
        financial_account_id: financialAccountId,
        date,
        description,
        amount,
        category_id: categoryId,
      });
    }

    db.run("COMMIT");

    return NextResponse.json(
      { message: "Transactions inserted successfully", inserted },
      { status: 201 },
    );
  } catch (error) {
    console.error("Transaction insert error:", error);
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      console.warn("Rollback failed:", rollbackError);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(req.url).searchParams;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return NextResponse.json(
      {
        error:
          "page must be a positive integer and limit must be an integer between 1 and 100",
      },
      { status: 400 },
    );
  }

  const offset = (page - 1) * limit;
  const total = (
    db
      .query(
        `SELECT COUNT(*) as count FROM transactions t
        JOIN financial_accounts fa ON t.financial_account_id = fa.id
        WHERE fa.user_id = ?`,
      )
      .get(userId) as { count: number }
  ).count;

  const transactions = db
    .query(
      `SELECT t.* FROM transactions t
      JOIN financial_accounts fa ON t.financial_account_id = fa.id
      WHERE fa.user_id = ?
      ORDER BY t.date DESC
      LIMIT ? OFFSET ?`,
    )
    .all(userId, limit, offset);

  return NextResponse.json(
    {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    { status: 200 },
  );
}
