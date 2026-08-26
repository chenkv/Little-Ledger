import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import {
  GET as transactionsGet,
  POST as transactionsPost,
} from "@/app/api/user/transactions/route";
import { transaction_row } from "@/types/api-res-types";

const originalQuery = db.query.bind(db);

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
  const username = `transaction-user${suffix}`;
  const email = `txn${suffix}@example.com`;
  const result = insertUser.run(username, email, "hash");
  return result.lastInsertRowid as number;
}

function createFinancialAccount(userId: number) {
  const insertAccount = db.query(
    "INSERT INTO financial_accounts (user_id, name, type, institution, description) VALUES (?, ?, ?, ?, ?)",
  );
  const result = insertAccount.run(
    userId,
    "Checking",
    "checking",
    "Test Bank",
    "Test account",
  );
  return result.lastInsertRowid as number;
}

describe("transactions endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("inserts transactions for an authenticated user", async () => {
    const userId = createUser();
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "valid-session-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-session-token",
      },
      body: JSON.stringify([
        {
          financial_account_id: accountId,
          date: "2026-08-05",
          description: "Coffee purchase",
          amount: 4.5,
          category_id: null,
        },
      ]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.message).toBe("Transactions inserted successfully");
    expect(Array.isArray(body.inserted)).toBe(true);
    expect(body.inserted.length).toBe(1);
    expect(body.inserted[0].financial_account_id).toBe(accountId);
    expect(body.inserted[0].description).toBe("Coffee purchase");
    expect(body.inserted[0].amount).toBe(4.5);

    const count = db
      .query("SELECT COUNT(*) as count FROM transactions")
      .get() as { count: number };
    expect(count.count).toBe(1);
  });

  it("rollbacks transaction insertions on error", async () => {
    const userId = createUser();
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "rollback-session-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer rollback-session-token",
      },
      body: JSON.stringify([
        {
          financial_account_id: accountId,
          date: "2026-08-05",
          description: "Valid transaction",
          amount: 10.0,
          category_id: null,
        },
        {
          financial_account_id: accountId,
          date: "2026-08-06",
          description: "Invalid transaction",
          amount: "not-a-number", // This will cause an error
          category_id: null,
        },
      ]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("amount must be a valid number");

    const count = db
      .query("SELECT COUNT(*) as count FROM transactions")
      .get() as { count: number };
    expect(count.count).toBe(0); // Ensure no transactions were inserted
  });

  it("returns 400 when financial account is invalid", async () => {
    const userId = createUser();
    createSessionForUser(userId, "valid-account-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-account-token",
      },
      body: JSON.stringify([
        {
          financial_account_id: "wrong", // Non-existent account
          date: "2026-08-05",
          description: "Coffee purchase",
          amount: 4.5,
          category_id: null,
        },
      ]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("financial_account_id must be a positive integer");
  });

  it("returns 400 when transaction date is missing", async () => {
    const userId = createUser();
    createSessionForUser(userId, "valid-account-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-account-token",
      },
      body: JSON.stringify([
        {
          financial_account_id: 1,
          description: "Coffee purchase",
          amount: 4.5,
          category_id: null,
        },
      ]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("date is required for each transaction");
  });

  it("returns 400 when transaction amount is bad", async () => {
    const userId = createUser();
    createSessionForUser(userId, "valid-account-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-account-token",
      },
      body: JSON.stringify([
        {
          financial_account_id: 1,
          date: "2026-08-05",
          description: "Coffee purchase",
          amount: "A string instead of a number",
          category_id: null,
        },
      ]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("amount must be a valid number");
  });

  it("returns 401 when authorization is missing", async () => {
    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when the request body is not an array", async () => {
    const userId = createUser();
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "test-session-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer test-session-token",
      },
      body: JSON.stringify({
        financial_account_id: accountId,
        date: "2026-08-05",
        amount: 10.0,
      }),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Request body must be an array of transactions");
  });

  it("returns 400 when the transaction list is empty", async () => {
    const userId = createUser();
    createFinancialAccount(userId);
    createSessionForUser(userId, "empty-list-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer empty-list-token",
      },
      body: JSON.stringify([]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Transaction list cannot be empty");
  });

  it("returns 400 when a transaction item is invalid", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-item-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer invalid-item-token",
      },
      body: JSON.stringify([null]),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Each transaction must be an object");
  });

  it("returns 500 when transaction insertion returns no result", async () => {
    const userId = createUser();
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "no-result-token");

    db.query = ((sql: string) => {
      if (sql.startsWith("INSERT INTO transactions")) {
        return { run: () => null };
      }
      return originalQuery(sql);
    }) as typeof db.query;

    try {
      const req = new Request("http://localhost/api/user/transactions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer no-result-token",
        },
        body: JSON.stringify([
          {
            financial_account_id: accountId,
            date: "2026-08-05",
            description: "Broken insert",
            amount: 12.0,
            category_id: null,
          },
        ]),
      });

      const res = await transactionsPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to insert transaction");
    } finally {
      db.query = originalQuery;
    }
  });

  it("returns 500 when an unexpected insert error occurs", async () => {
    const userId = createUser();
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "unexpected-error-token");

    db.query = ((sql: string) => {
      if (sql.startsWith("INSERT INTO transactions")) {
        return {
          run: () => {
            throw new Error("forced insert failure");
          },
        };
      }
      return originalQuery(sql);
    }) as typeof db.query;

    try {
      const req = new Request("http://localhost/api/user/transactions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer unexpected-error-token",
        },
        body: JSON.stringify([
          {
            financial_account_id: accountId,
            date: "2026-08-05",
            description: "Trigger exception",
            amount: 12.0,
            category_id: null,
          },
        ]),
      });

      const res = await transactionsPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    } finally {
      db.query = originalQuery;
    }
  });

  it("returns 401 for GET when the authorization header is missing", async () => {
    const req = new Request("http://localhost/api/user/transactions", {
      method: "GET",
    });

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns only transactions belonging to the authenticated user", async () => {
    const user1 = createUser("");
    const account1 = createFinancialAccount(user1);
    createSessionForUser(user1, "get-user1-token");

    const user2 = createUser("-2");
    const account2 = createFinancialAccount(user2);
    createSessionForUser(user2, "get-user2-token");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(account1, "2026-08-08", "User1 purchase", 10.0, null);
    insertTransaction.run(account2, "2026-08-09", "User2 purchase", 20.0, null);
    insertTransaction.run(account1, "2026-08-10", "User1 refund", 5.5, null);

    const req = new Request("http://localhost/api/user/transactions", {
      method: "GET",
      headers: { authorization: "Bearer get-user1-token" },
    });

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions.length).toBe(2);
    expect(
      body.transactions.every(
        (tx: transaction_row) => tx.financial_account_id === account1,
      ),
    ).toBe(true);
    expect(body.transactions[0].date >= body.transactions[1].date).toBe(true);
  });

  it("returns an empty array for GET when the authenticated user has no transactions", async () => {
    const userId = createUser("-3");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-empty-token");

    const req = new Request("http://localhost/api/user/transactions", {
      method: "GET",
      headers: { authorization: "Bearer get-empty-token" },
    });

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions.length).toBe(0);
  });

  it("returns the requested transaction page with pagination metadata", async () => {
    const userId = createUser("-4");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-paginated-token");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(accountId, "2026-08-08", "Oldest", 10.0, null);
    insertTransaction.run(accountId, "2026-08-10", "Newest", 20.0, null);
    insertTransaction.run(accountId, "2026-08-09", "Middle", 15.0, null);

    const req = new Request(
      "http://localhost/api/user/transactions?page=2&limit=1",
      {
        method: "GET",
        headers: { authorization: "Bearer get-paginated-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(1);
    expect(body.transactions[0].description).toBe("Middle");
    expect(body.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
  });

  it("returns 400 for invalid transaction pagination parameters", async () => {
    const userId = createUser("-5");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-invalid-pagination-token");

    const req = new Request(
      "http://localhost/api/user/transactions?page=0&limit=101",
      {
        method: "GET",
        headers: {
          authorization: "Bearer get-invalid-pagination-token",
        },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      "page must be a positive integer and limit must be an integer between 1 and 100",
    );
  });
});
