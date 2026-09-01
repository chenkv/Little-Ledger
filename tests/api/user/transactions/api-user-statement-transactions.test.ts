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

function createCategory(userId: number, name: string) {
  const insertCategory = db.query(
    "INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)",
  );
  const result = insertCategory.run(userId, name, "expense");
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

  it("filters transactions by category", async () => {
    const userId = createUser("-6");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-category-filter-token");

    const category1Id = createCategory(userId, "Groceries");
    const category2Id = createCategory(userId, "Gas");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(
      accountId,
      "2026-08-08",
      "Groceries",
      50.0,
      category1Id,
    );
    insertTransaction.run(accountId, "2026-08-09", "Gas", 40.0, category2Id);
    insertTransaction.run(
      accountId,
      "2026-08-10",
      "More Groceries",
      35.0,
      category1Id,
    );

    const req = new Request(
      `http://localhost/api/user/transactions?category=${category1Id}`,
      {
        method: "GET",
        headers: { authorization: "Bearer get-category-filter-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(
      body.transactions.every(
        (tx: transaction_row) => tx.category_id === category1Id,
      ),
    ).toBe(true);
    expect(body.pagination.total).toBe(2);
  });

  it("filters transactions by name (description)", async () => {
    const userId = createUser("-7");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-name-filter-token");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(
      accountId,
      "2026-08-08",
      "Starbucks Coffee",
      5.5,
      null,
    );
    insertTransaction.run(
      accountId,
      "2026-08-09",
      "Whole Foods Groceries",
      75.0,
      null,
    );
    insertTransaction.run(
      accountId,
      "2026-08-10",
      "Coffee Bean Cafe",
      6.0,
      null,
    );

    const req = new Request(
      "http://localhost/api/user/transactions?name=coffee",
      {
        method: "GET",
        headers: { authorization: "Bearer get-name-filter-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(
      body.transactions.every((tx: transaction_row) =>
        tx.description.toLowerCase().includes("coffee"),
      ),
    ).toBe(true);
    expect(body.pagination.total).toBe(2);
  });

  it("filters transactions by date range", async () => {
    const userId = createUser("-8");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-date-range-filter-token");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(accountId, "2026-07-15", "July purchase", 20.0, null);
    insertTransaction.run(
      accountId,
      "2026-08-05",
      "August purchase 1",
      30.0,
      null,
    );
    insertTransaction.run(
      accountId,
      "2026-08-20",
      "August purchase 2",
      40.0,
      null,
    );
    insertTransaction.run(
      accountId,
      "2026-09-10",
      "September purchase",
      50.0,
      null,
    );

    const req = new Request(
      "http://localhost/api/user/transactions?minDate=2026-08-01&maxDate=2026-08-31",
      {
        method: "GET",
        headers: { authorization: "Bearer get-date-range-filter-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(
      body.transactions.every(
        (tx: transaction_row) =>
          tx.date >= "2026-08-01" && tx.date <= "2026-08-31",
      ),
    ).toBe(true);
    expect(body.pagination.total).toBe(2);
  });

  it("filters transactions by amount range", async () => {
    const userId = createUser("-9");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-amount-range-filter-token");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(accountId, "2026-08-05", "Small purchase", 5.0, null);
    insertTransaction.run(
      accountId,
      "2026-08-06",
      "Medium purchase 1",
      50.0,
      null,
    );
    insertTransaction.run(
      accountId,
      "2026-08-07",
      "Medium purchase 2",
      75.0,
      null,
    );
    insertTransaction.run(
      accountId,
      "2026-08-08",
      "Large purchase",
      200.0,
      null,
    );

    const req = new Request(
      "http://localhost/api/user/transactions?minAmount=25&maxAmount=100",
      {
        method: "GET",
        headers: { authorization: "Bearer get-amount-range-filter-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(
      body.transactions.every(
        (tx: transaction_row) => tx.amount >= 25 && tx.amount <= 100,
      ),
    ).toBe(true);
    expect(body.pagination.total).toBe(2);
  });

  it("filters transactions by combined filters", async () => {
    const userId = createUser("-10");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-combined-filters-token");

    const category1Id = createCategory(userId, "Groceries");
    const category2Id = createCategory(userId, "Gas");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    insertTransaction.run(
      accountId,
      "2026-08-05",
      "Grocery Store",
      35.0,
      category1Id,
    );
    insertTransaction.run(
      accountId,
      "2026-08-10",
      "Gas Station",
      50.0,
      category2Id,
    );
    insertTransaction.run(
      accountId,
      "2026-08-15",
      "Whole Foods",
      60.0,
      category1Id,
    );
    insertTransaction.run(
      accountId,
      "2026-09-05",
      "Coffee Shop",
      5.0,
      category1Id,
    );

    const req = new Request(
      `http://localhost/api/user/transactions?category=${category1Id}&minDate=2026-08-01&maxDate=2026-08-31&minAmount=30&maxAmount=65`,
      {
        method: "GET",
        headers: { authorization: "Bearer get-combined-filters-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(
      body.transactions.every(
        (tx: transaction_row) =>
          tx.category_id === category1Id &&
          tx.date >= "2026-08-01" &&
          tx.date <= "2026-08-31" &&
          tx.amount >= 30 &&
          tx.amount <= 65,
      ),
    ).toBe(true);
    expect(body.pagination.total).toBe(2);
  });

  it("returns 400 for invalid category filter", async () => {
    const userId = createUser("-11");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-invalid-category-filter-token");

    const req = new Request(
      "http://localhost/api/user/transactions?category=invalid",
      {
        method: "GET",
        headers: { authorization: "Bearer get-invalid-category-filter-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("category must be a valid integer");
  });

  it("returns 400 for invalid minAmount filter", async () => {
    const userId = createUser("-12");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-invalid-min-amount-token");

    const req = new Request(
      "http://localhost/api/user/transactions?minAmount=not-a-number",
      {
        method: "GET",
        headers: { authorization: "Bearer get-invalid-min-amount-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("minAmount must be a valid number");
  });

  it("returns 400 for invalid maxAmount filter", async () => {
    const userId = createUser("-13");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-invalid-max-amount-token");

    const req = new Request(
      "http://localhost/api/user/transactions?maxAmount=abc",
      {
        method: "GET",
        headers: { authorization: "Bearer get-invalid-max-amount-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("maxAmount must be a valid number");
  });

  it("returns 400 for invalid minDate filter", async () => {
    const userId = createUser("-15");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-invalid-min-date-token");

    const req = new Request(
      "http://localhost/api/user/transactions?minDate=01/13/2026",
      {
        method: "GET",
        headers: { authorization: "Bearer get-invalid-min-date-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("minDate must be in YYYY-MM-DD format");
  });

  it("returns 400 for invalid maxDate filter", async () => {
    const userId = createUser("-16");
    createFinancialAccount(userId);
    createSessionForUser(userId, "get-invalid-max-date-token");

    const req = new Request(
      "http://localhost/api/user/transactions?maxDate=02/30/2026",
      {
        method: "GET",
        headers: { authorization: "Bearer get-invalid-max-date-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("maxDate must be in YYYY-MM-DD format");
  });

  it("handles filters with pagination together", async () => {
    const userId = createUser("-14");
    const accountId = createFinancialAccount(userId);
    createSessionForUser(userId, "get-filters-pagination-token");

    const categoryId = createCategory(userId, "Coffee");

    const insertTransaction = db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)",
    );
    for (let i = 0; i < 5; i++) {
      insertTransaction.run(
        accountId,
        "2026-08-05",
        `Coffee ${i}`,
        5.0 + i,
        categoryId,
      );
    }

    const req = new Request(
      `http://localhost/api/user/transactions?category=${categoryId}&minAmount=5&maxAmount=10&page=2&limit=2`,
      {
        method: "GET",
        headers: { authorization: "Bearer get-filters-pagination-token" },
      },
    );

    const res = await transactionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
  });
});
