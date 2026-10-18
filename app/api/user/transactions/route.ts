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

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "date must be in YYYY-MM-DD format" },
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

export async function PATCH(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      return NextResponse.json(
        { error: "Request body must be a transaction object" },
        { status: 400 },
      );
    }

    const transaction = requestBody as Record<string, unknown>;
    const id = transaction.id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Transaction id must be a positive integer" },
        { status: 400 },
      );
    }

    const updateFields = Object.entries(transaction).filter(
      ([key]) => key !== "id",
    );
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    const existingTransaction = db
      .query(
        `SELECT transactions.id
         FROM transactions
         JOIN financial_accounts
           ON financial_accounts.id = transactions.financial_account_id
         WHERE transactions.id = ? AND financial_accounts.user_id = ?`,
      )
      .get(id, userId);

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "No transaction found with the provided id" },
        { status: 404 },
      );
    }

    const allowedFields = new Set([
      "financial_account_id",
      "date",
      "description",
      "amount",
      "category_id",
    ]);
    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    for (const [key, value] of updateFields) {
      if (!allowedFields.has(key)) {
        return NextResponse.json(
          { error: `Field cannot be updated: ${key}` },
          { status: 400 },
        );
      }
      if (
        value !== null &&
        typeof value !== "string" &&
        typeof value !== "number"
      ) {
        return NextResponse.json(
          { error: `Invalid value for field: ${key}` },
          { status: 400 },
        );
      }

      if (key === "financial_account_id") {
        if (
          typeof value !== "number" ||
          !Number.isSafeInteger(value) ||
          value <= 0
        ) {
          return NextResponse.json(
            { error: `${key} must be a positive integer` },
            { status: 400 },
          );
        }
        const account = db
          .query(
            "SELECT id FROM financial_accounts WHERE id = ? AND user_id = ?",
          )
          .get(value, userId);
        if (!account) {
          return NextResponse.json(
            {
              error:
                "financial_account_id must belong to the authenticated user",
            },
            { status: 400 },
          );
        }
      } else if (key === "category_id") {
        if (
          value !== null &&
          (typeof value !== "number" ||
            !Number.isSafeInteger(value) ||
            value <= 0)
        ) {
          return NextResponse.json(
            { error: "category_id must be null or a positive integer" },
            { status: 400 },
          );
        }
        if (value !== null) {
          const category = db
            .query("SELECT id FROM categories WHERE id = ? AND user_id = ?")
            .get(value, userId);
          if (!category) {
            return NextResponse.json(
              { error: "category_id must belong to the authenticated user" },
              { status: 400 },
            );
          }
        }
      } else if (key === "amount") {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return NextResponse.json(
            { error: "amount must be a valid number" },
            { status: 400 },
          );
        }
      } else if (key === "date") {
        const parsedDate =
          typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : null;
        if (
          typeof value !== "string" ||
          !parsedDate ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== value
        ) {
          return NextResponse.json(
            { error: "date must be in YYYY-MM-DD format" },
            { status: 400 },
          );
        }
      } else if (
        key === "description" &&
        value !== null &&
        typeof value !== "string"
      ) {
        return NextResponse.json(
          { error: "description must be a string or null" },
          { status: 400 },
        );
      }

      setClauses.push(`${key} = ?`);
      params.push(value);
    }

    params.push(id, userId);
    const updateStmt = db.query(
      `UPDATE transactions
       SET ${setClauses.join(", ")}
       WHERE id = ?
         AND EXISTS (
           SELECT 1
           FROM financial_accounts
           WHERE financial_accounts.id = transactions.financial_account_id
             AND financial_accounts.user_id = ?
         )`,
    );

    const result = updateStmt.run(...params);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "No transaction found with the provided id" },
        { status: 404 },
      );
    }

    const updatedTransaction = db
      .query(
        `SELECT transactions.id, transactions.financial_account_id, transactions.date,
                transactions.description, transactions.amount, transactions.category_id
         FROM transactions
         JOIN financial_accounts
           ON financial_accounts.id = transactions.financial_account_id
         WHERE transactions.id = ? AND financial_accounts.user_id = ?`,
      )
      .get(id, userId);

    return NextResponse.json(
      {
        message: "Transaction updated successfully",
        transaction: updatedTransaction,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Transaction update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  let transactionStarted = false;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      return NextResponse.json(
        { error: "Request body must be an object containing transaction ids" },
        { status: 400 },
      );
    }

    const request = requestBody as Record<string, unknown>;
    if (
      Object.keys(request).length !== 1 ||
      !Object.hasOwn(request, "ids") ||
      !Array.isArray(request.ids) ||
      request.ids.length === 0 ||
      request.ids.length > 100 ||
      request.ids.some(
        (id) => typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0,
      ) ||
      new Set(request.ids).size !== request.ids.length
    ) {
      return NextResponse.json(
        {
          error:
            "ids must be an array of 1 to 100 unique positive integer transaction ids",
        },
        { status: 400 },
      );
    }

    const ids = request.ids as number[];
    const placeholders = ids.map(() => "?").join(", ");

    db.run("BEGIN");
    transactionStarted = true;

    const ownedTransactions = db
      .query(
        `SELECT transactions.id
         FROM transactions
         JOIN financial_accounts
           ON financial_accounts.id = transactions.financial_account_id
         WHERE transactions.id IN (${placeholders})
           AND financial_accounts.user_id = ?`,
      )
      .all(...ids, userId) as { id: number }[];

    if (ownedTransactions.length !== ids.length) {
      db.run("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "One or more transactions were not found" },
        { status: 404 },
      );
    }

    const result = db
      .query(
        `DELETE FROM transactions
         WHERE id IN (${placeholders})
           AND EXISTS (
             SELECT 1
             FROM financial_accounts
             WHERE financial_accounts.id = transactions.financial_account_id
               AND financial_accounts.user_id = ?
           )`,
      )
      .run(...ids, userId);

    if (result.changes !== ids.length) {
      db.run("ROLLBACK");
      transactionStarted = false;
      return NextResponse.json(
        { error: "One or more transactions were not found" },
        { status: 404 },
      );
    }

    db.run("COMMIT");
    transactionStarted = false;

    return NextResponse.json(
      {
        message: "Transactions deleted successfully",
        deletedCount: result.changes,
        deletedIds: ids,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Transaction delete error:", error);
    if (transactionStarted) {
      try {
        db.run("ROLLBACK");
      } catch (rollbackError) {
        console.warn("Transaction delete rollback failed:", rollbackError);
      }
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

  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("category");
  const name = searchParams.get("name");
  const minDate = searchParams.get("minDate");
  const maxDate = searchParams.get("maxDate");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  if (
    accountId !== null &&
    (!/^\d+$/.test(accountId) ||
      !Number.isSafeInteger(Number(accountId)) ||
      Number(accountId) <= 0)
  ) {
    return NextResponse.json(
      { error: "accountId must be a positive integer" },
      { status: 400 },
    );
  }

  // Validate date formats are YYYY-MM-DD
  if (minDate && !/^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
    return NextResponse.json(
      { error: "minDate must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  if (maxDate && !/^\d{4}-\d{2}-\d{2}$/.test(maxDate)) {
    return NextResponse.json(
      { error: "maxDate must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  // Validate numeric filters
  if (categoryId && !Number.isInteger(Number(categoryId))) {
    return NextResponse.json(
      { error: "category must be a valid integer" },
      { status: 400 },
    );
  }

  if (minAmount && !Number.isFinite(Number(minAmount))) {
    return NextResponse.json(
      { error: "minAmount must be a valid number" },
      { status: 400 },
    );
  }

  if (maxAmount && !Number.isFinite(Number(maxAmount))) {
    return NextResponse.json(
      { error: "maxAmount must be a valid number" },
      { status: 400 },
    );
  }

  // Build dynamic WHERE clause
  const whereConditions = ["fa.user_id = ?"];
  const params: Array<string | number> = [userId];

  if (accountId !== null) {
    whereConditions.push("t.financial_account_id = ?");
    params.push(Number(accountId));
  }

  if (categoryId) {
    whereConditions.push("t.category_id = ?");
    params.push(Number(categoryId));
  }

  if (name) {
    whereConditions.push("t.description LIKE ?");
    params.push(`%${name}%`);
  }

  if (minDate) {
    whereConditions.push("t.date >= ?");
    params.push(minDate);
  }

  if (maxDate) {
    whereConditions.push("t.date <= ?");
    params.push(maxDate);
  }

  if (minAmount !== null && minAmount !== undefined && minAmount !== "") {
    whereConditions.push("t.amount >= ?");
    params.push(Number(minAmount));
  }

  if (maxAmount !== null && maxAmount !== undefined && maxAmount !== "") {
    whereConditions.push("t.amount <= ?");
    params.push(Number(maxAmount));
  }

  const whereClause = whereConditions.join(" AND ");

  const offset = (page - 1) * limit;
  const countParams = [...params];
  const total = (
    db
      .query(
        `SELECT COUNT(*) as count FROM transactions t
        JOIN financial_accounts fa ON t.financial_account_id = fa.id
        WHERE ${whereClause}`,
      )
      .get(...countParams) as { count: number }
  ).count;

  const selectParams = [...params, limit, offset];
  const transactions = db
    .query(
      `SELECT t.* FROM transactions t
      JOIN financial_accounts fa ON t.financial_account_id = fa.id
      WHERE ${whereClause}
      ORDER BY t.date DESC
      LIMIT ? OFFSET ?`,
    )
    .all(...selectParams);

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
