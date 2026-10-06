import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { GET } from "@/app/api/user/dashboard/monthly-breakdown/route";

function createSessionForUser(userId: number, token: string) {
  const insertSession = db.query(
    "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
  );
  insertSession.run(
    userId,
    token,
    new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  );
}

function createUser(suffix = "") {
  const insertUser = db.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
  );
  const username = `monthly-user${suffix}`;
  const email = `monthly${suffix}@example.com`;
  const result = insertUser.run(username, email, "hash");
  return result.lastInsertRowid as number;
}

function createFinancialAccount(userId: number, name = "Checking") {
  const insertAccount = db.query(
    "INSERT INTO financial_accounts (user_id, name, type, institution, description) VALUES (?, ?, ?, ?, ?)",
  );
  const result = insertAccount.run(
    userId,
    name,
    "checking",
    "Test Bank",
    "Primary account",
  );
  return result.lastInsertRowid as number;
}

function createTransaction(
  accountId: number,
  date: string,
  description: string,
  amount: number,
) {
  const insertTransaction = db.query(
    "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
  );
  const result = insertTransaction.run(
    accountId,
    date,
    description,
    amount,
    null,
  );
  return result.lastInsertRowid as number;
}

describe("dashboard monthly breakdown endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("returns the authenticated user's transactions for the requested month", async () => {
    const userId = createUser();
    const otherUserId = createUser("-other");
    const accountId = createFinancialAccount(userId, "Checking");
    const otherAccountId = createFinancialAccount(otherUserId, "Other account");
    createSessionForUser(userId, "valid-monthly-token");

    createTransaction(accountId, "2026-08-02", "Groceries", 94.25);
    createTransaction(accountId, "2026-08-15", "Rent", -1200);
    createTransaction(otherAccountId, "2026-08-12", "Hidden transaction", 55.5);
    createTransaction(accountId, "2026-09-01", "Next month", 30);

    const req = new Request(
      "http://localhost/api/user/dashboard/monthly-breakdown?month=2026-08",
      {
        headers: { authorization: "Bearer valid-monthly-token" },
      },
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions).toHaveLength(2);
    expect(body.transactions[0].description).toBe("Rent");
    expect(body.transactions[1].description).toBe("Groceries");
    expect(
      body.transactions.every((tx) => tx.financial_account_id === accountId),
    ).toBe(true);
  });

  it("returns 401 when no valid session is provided", async () => {
    const req = new Request(
      "http://localhost/api/user/dashboard/monthly-breakdown?month=2026-08",
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when the month query is missing or malformed", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-month-token");

    const req = new Request(
      "http://localhost/api/user/dashboard/monthly-breakdown?month=2026/08",
      {
        headers: { authorization: "Bearer invalid-month-token" },
      },
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("month must be in YYYY-MM format");
  });

  it("returns 500 when the database query fails", async () => {
    const userId = createUser();
    createSessionForUser(userId, "error-month-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (typeof sql === "string" && sql.includes("FROM transactions")) {
        throw new Error("database failure");
      }
      return originalQuery(sql);
    }) as typeof db.query;

    const req = new Request(
      "http://localhost/api/user/dashboard/monthly-breakdown?month=2026-08",
      {
        headers: { authorization: "Bearer error-month-token" },
      },
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal Server Error");

    db.query = originalQuery;
  });
});
