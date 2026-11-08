import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import {
  applyCategoryRuleToAll,
  matchCategoryToDescription,
} from "@/app/lib/transactions";

function createUser(suffix: string) {
  const result = db
    .query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    )
    .run(
      `categorize-user-${suffix}`,
      `categorize-${suffix}@example.com`,
      "hash",
    );
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

function createCategory(userId: number) {
  const result = db
    .query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    )
    .run(userId, "Food", "");
  return Number(result.lastInsertRowid);
}

function createCategoryWithRules(userId: number, rules: string | null) {
  const result = db
    .query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    )
    .run(userId, "Category", rules);
  return Number(result.lastInsertRowid);
}

function createTransaction(accountId: number, description: string) {
  return Number(
    db
      .query(
        "INSERT INTO transactions (financial_account_id, date, description, amount) VALUES (?, ?, ?, ?)",
      )
      .run(accountId, "2026-11-05", description, 10).lastInsertRowid,
  );
}

describe("applyCategoryRuleToAll", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM categories");
    db.run("DELETE FROM users");
  });

  it("matches rules case-insensitively with AND within lines and OR between lines", () => {
    const userId = createUser("rules");
    const otherUserId = createUser("rules-other");
    const accountId = createAccount(userId, "Checking");
    const otherAccountId = createAccount(otherUserId, "Other");
    const categoryId = createCategory(userId);
    const coffeeMarketId = createTransaction(accountId, "COFFEE Market");
    const bakeryId = createTransaction(accountId, "Local Bakery");
    const coffeeOnlyId = createTransaction(accountId, "Coffee Shop");
    const otherUserIdTransaction = createTransaction(
      otherAccountId,
      "Coffee Market",
    );

    const changes = applyCategoryRuleToAll({
      userId,
      categoryId,
      rules: " coffee , MARKET \n\n bakery ",
    });

    const transactionCategories = db
      .query("SELECT id, category_id FROM transactions")
      .all() as { id: number; category_id: number | null }[];
    const categoryByTransaction = new Map(
      transactionCategories.map(({ id, category_id }) => [id, category_id]),
    );

    expect(changes).toBe(2);
    expect(categoryByTransaction.get(coffeeMarketId)).toBe(categoryId);
    expect(categoryByTransaction.get(bakeryId)).toBe(categoryId);
    expect(categoryByTransaction.get(coffeeOnlyId)).toBeNull();
    expect(categoryByTransaction.get(otherUserIdTransaction)).toBeNull();
  });

  it("rejects invalid IDs, categories not owned by the user, and empty rules", () => {
    const userId = createUser("validation");
    const otherUserId = createUser("validation-other");
    const categoryId = createCategory(userId);

    expect(() =>
      applyCategoryRuleToAll({ userId: 0, categoryId, rules: "coffee" }),
    ).toThrow("Invalid user ID.");
    expect(() =>
      applyCategoryRuleToAll({ userId, categoryId: 0, rules: "coffee" }),
    ).toThrow("Invalid category ID.");
    expect(() =>
      applyCategoryRuleToAll({
        userId: otherUserId,
        categoryId,
        rules: "coffee",
      }),
    ).toThrow("Category not found.");
    expect(() =>
      applyCategoryRuleToAll({ userId, categoryId, rules: " \n , \n " }),
    ).toThrow("At least one matching rule is required.");
  });

  it("reports transaction update failures", () => {
    const userId = createUser("failure");
    const categoryId = createCategory(userId);
    const originalPrepare = db.prepare.bind(db);
    db.prepare = ((sql: string) => {
      if (sql.includes("UPDATE transactions AS t")) {
        return {
          run: () => {
            throw new Error("forced transaction update failure");
          },
        };
      }
      return originalPrepare(sql);
    }) as typeof db.prepare;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      expect(() =>
        applyCategoryRuleToAll({ userId, categoryId, rules: "coffee" }),
      ).toThrow("Failed to update transactions.");
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      db.prepare = originalPrepare;
      consoleErrorSpy.mockRestore();
    }
  });
});

describe("matchCategoryToDescription", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM categories");
    db.run("DELETE FROM users");
  });

  it("matches case-insensitively with AND/OR rules and returns the first matching category", () => {
    const userId = createUser("description-matches");
    const otherUserId = createUser("description-matches-other");
    const firstCategoryId = createCategoryWithRules(
      userId,
      " coffee , SHOP \n bakery ",
    );
    createCategoryWithRules(userId, "coffee");
    createCategoryWithRules(otherUserId, "unrelated merchant");
    const emptyCategoryId = createCategoryWithRules(userId, null);

    expect(
      matchCategoryToDescription(userId, [
        "COFFEE SHOP",
        "Local bakery",
        "Coffee roaster",
        "Unrelated merchant",
      ]),
    ).toEqual([
      { description: "COFFEE SHOP", categoryId: firstCategoryId },
      { description: "Local bakery", categoryId: firstCategoryId },
      { description: "Coffee roaster", categoryId: firstCategoryId + 1 },
      { description: "Unrelated merchant", categoryId: null },
    ]);
    expect(emptyCategoryId).toBeGreaterThan(firstCategoryId);
  });

  it("ignores malformed and blank rule lines", () => {
    const userId = createUser("description-malformed");
    const categoryId = createCategoryWithRules(
      userId,
      "coffee,,shop\n   \n bakery ",
    );

    expect(
      matchCategoryToDescription(userId, ["Coffee shop", "Local bakery"]),
    ).toEqual([
      { description: "Coffee shop", categoryId: null },
      { description: "Local bakery", categoryId },
    ]);
  });

  it("rejects invalid users and empty descriptions", () => {
    expect(() => matchCategoryToDescription(0, ["Coffee"])).toThrow(
      "Invalid user ID.",
    );
    expect(() => matchCategoryToDescription(1, [])).toThrow(
      "Empty transaction descriptions.",
    );
  });
});
