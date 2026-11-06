import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import {
  getCommonUncategorizedTransactions,
  getLastUncategorizedTransactions,
} from "@/app/lib/insights";

function createUser(suffix: string) {
  const result = db
    .query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    )
    .run(`insights-user-${suffix}`, `insights-${suffix}@example.com`, "hash");
  return Number(result.lastInsertRowid);
}

function createAccount(userId: number, name: string) {
  const institution = db
    .query("SELECT id FROM financial_institutions WHERE name = ?")
    .get("Chase") as { id: number };
  const result = db
    .query(
      "INSERT INTO financial_accounts (user_id, name, type, institution) VALUES (?, ?, ?, ?)",
    )
    .run(userId, name, "checking", institution.id);
  return Number(result.lastInsertRowid);
}

function createTransaction(
  accountId: number,
  description: string,
  createdAt: string,
  categoryId: number | null = null,
) {
  db.query(
    "INSERT INTO transactions (financial_account_id, date, description, amount, category_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(accountId, "2026-11-05", description, 10, categoryId, createdAt);
}

describe("uncategorized transaction insights", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM categories");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("groups repeated uncategorized transactions by account and scopes them to the user", async () => {
    const userId = createUser("common");
    const otherUserId = createUser("common-other");
    const checkingId = createAccount(userId, "Checking");
    const savingsId = createAccount(userId, "Savings");
    const otherAccountId = createAccount(otherUserId, "Other");
    const categoryId = Number(
      db
        .query(
          "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
        )
        .run(userId, "Food", "market").lastInsertRowid,
    );

    createTransaction(checkingId, "Coffee Shop", "2026-11-01 09:00:00");
    createTransaction(checkingId, "Coffee Shop", "2026-11-02 09:00:00");
    createTransaction(
      checkingId,
      "Coffee Shop",
      "2026-11-03 09:00:00",
      categoryId,
    );
    createTransaction(savingsId, "Coffee Shop", "2026-11-04 09:00:00");
    createTransaction(checkingId, "One-time purchase", "2026-11-05 09:00:00");
    createTransaction(otherAccountId, "Coffee Shop", "2026-11-06 09:00:00");
    createTransaction(otherAccountId, "Coffee Shop", "2026-11-07 09:00:00");

    const result = await getCommonUncategorizedTransactions(userId);

    expect(result).toEqual([
      {
        description: "Coffee Shop",
        financial_account_name: "Checking",
        financial_account_id: checkingId,
        occurrence_count: 2,
      },
    ]);
  });

  it("returns the 20 latest uncategorized transactions for the user", async () => {
    const userId = createUser("latest");
    const otherUserId = createUser("latest-other");
    const accountId = createAccount(userId, "Checking");
    const otherAccountId = createAccount(otherUserId, "Other");
    const categoryId = Number(
      db
        .query(
          "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
        )
        .run(userId, "Food", "market").lastInsertRowid,
    );

    for (let index = 1; index <= 21; index++) {
      createTransaction(
        accountId,
        `Transaction ${index}`,
        `2026-11-${String(index).padStart(2, "0")} 12:00:00`,
        index === 21 ? categoryId : null,
      );
    }
    createTransaction(
      otherAccountId,
      "Other user's transaction",
      "2026-11-30 12:00:00",
    );

    const result = await getLastUncategorizedTransactions(userId);

    expect(result).toHaveLength(20);
    expect(result[0]).toMatchObject({
      description: "Transaction 20",
      transaction_id: expect.any(Number),
      transaction_date: "2026-11-05",
      financial_account_name: "Checking",
      financial_account_id: accountId,
    });
    expect(result[19].description).toBe("Transaction 1");
    expect(
      result.some(
        (transaction) => transaction.description === "Transaction 21",
      ),
    ).toBe(false);
    expect(
      result.some(
        (transaction) => transaction.description === "Other user's transaction",
      ),
    ).toBe(false);
  });

  it("returns empty arrays when there are no uncategorized transactions", async () => {
    const userId = createUser("empty");

    await expect(getCommonUncategorizedTransactions(userId)).resolves.toEqual(
      [],
    );
    await expect(getLastUncategorizedTransactions(userId)).resolves.toEqual([]);
  });
});
