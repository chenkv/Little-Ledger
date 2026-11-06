import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { GET as categoryInsightsGet } from "@/app/api/user/categories/insights/route";

function createUser() {
  const result = db
    .query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    )
    .run("category-insights-user", "category-insights@example.com", "hash");
  return Number(result.lastInsertRowid);
}

function createSession(userId: number, token: string) {
  db.query(
    "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
  ).run(userId, token, new Date(Date.now() + 60_000).toISOString());
}

describe("category insights endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM categories");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("returns recommended and latest uncategorized transactions for the user", async () => {
    const userId = createUser();
    const institution = db
      .query("SELECT id FROM financial_institutions WHERE name = ?")
      .get("Chase") as { id: number };
    const accountId = Number(
      db
        .query(
          "INSERT INTO financial_accounts (user_id, name, type, institution) VALUES (?, ?, ?, ?)",
        )
        .run(userId, "Checking", "checking", institution.id).lastInsertRowid,
    );
    db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(accountId, "2026-11-01", "Coffee Shop", 5, "2026-11-01 09:00:00");
    db.query(
      "INSERT INTO transactions (financial_account_id, date, description, amount, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(accountId, "2026-11-02", "Coffee Shop", 6, "2026-11-02 09:00:00");
    createSession(userId, "category-insights-token");

    const req = new Request("http://localhost/api/user/categories/insights", {
      headers: { cookie: "session_token=category-insights-token" },
    });
    const res = await categoryInsightsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.recommended_transactions_to_categorize).toEqual([
      {
        description: "Coffee Shop",
        financial_account_name: "Checking",
        financial_account_id: accountId,
        occurrence_count: 2,
      },
    ]);
    expect(body.latest_transactions_to_categorize).toHaveLength(2);
    expect(body.latest_transactions_to_categorize[0]).toMatchObject({
      description: "Coffee Shop",
      transaction_date: "2026-11-02",
      financial_account_name: "Checking",
      financial_account_id: accountId,
    });
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const res = await categoryInsightsGet(
      new Request("http://localhost/api/user/categories/insights"),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 500 when an insight query fails", async () => {
    const userId = createUser();
    createSession(userId, "category-insights-error-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (sql.includes("COUNT(*) AS occurrence_count")) {
        throw new Error("forced insights query failure");
      }
      return originalQuery(sql);
    }) as typeof db.query;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      const req = new Request("http://localhost/api/user/categories/insights", {
        headers: { cookie: "session_token=category-insights-error-token" },
      });
      const res = await categoryInsightsGet(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal Server Error");
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      db.query = originalQuery;
      consoleErrorSpy.mockRestore();
    }
  });
});
