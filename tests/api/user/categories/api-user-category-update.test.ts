import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { PATCH as categoryPatch } from "@/app/api/user/categories/route";

function createSessionForUser(userId: number, token: string) {
  db.query(
    "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
  ).run(userId, token, new Date(Date.now() + 1000 * 60 * 60).toISOString());
}

function createUser() {
  const result = db
    .query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    )
    .run("category-update-user", "category-update@example.com", "hash");
  return Number(result.lastInsertRowid);
}

function createCategory(userId: number) {
  const result = db
    .query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    )
    .run(userId, "Groceries", "market");
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

function createTransaction(accountId: number, description: string) {
  return Number(
    db
      .query(
        "INSERT INTO transactions (financial_account_id, date, description, amount) VALUES (?, ?, ?, ?)",
      )
      .run(accountId, "2026-11-05", description, 10).lastInsertRowid,
  );
}

function createPatchRequest(
  token: string | null,
  categoryId: number | string,
  body: string,
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("cookie", `session_token=${token}`);

  let requestBody = body;
  try {
    const parsedBody: unknown = JSON.parse(body);
    if (
      parsedBody &&
      typeof parsedBody === "object" &&
      !Array.isArray(parsedBody)
    ) {
      requestBody = JSON.stringify({ ...parsedBody, id: categoryId });
    }
  } catch {
    // Keep malformed JSON intact for validation tests.
  }

  return new Request("http://localhost/api/user/categories", {
    method: "PATCH",
    headers,
    body: requestBody,
  });
}

describe("category update endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM transactions");
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM categories");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("updates only the supplied category name", async () => {
    const userId = createUser();
    const categoryId = createCategory(userId);
    const accountId = createAccount(userId, "Checking");
    const transactionId = createTransaction(accountId, "Market purchase");
    createSessionForUser(userId, "category-update-name-token");

    const res = await categoryPatch(
      createPatchRequest(
        "category-update-name-token",
        categoryId,
        '{"name":"  Food  "}',
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.category).toEqual({
      id: categoryId,
      name: "Food",
      match_rules: "market",
    });
    expect(
      (
        db
          .query("SELECT category_id FROM transactions WHERE id = ?")
          .get(transactionId) as { category_id: number | null }
      ).category_id,
    ).toBeNull();
  });

  it("categorizes matching transactions when match rules are updated", async () => {
    const userId = createUser();
    const otherUserId = db
      .query(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      )
      .run(
        "other-category-auto-user",
        "other-category-auto@example.com",
        "hash",
      ).lastInsertRowid as number;
    const categoryId = createCategory(userId);
    const accountId = createAccount(userId, "Checking");
    const otherAccountId = createAccount(otherUserId, "Other");
    const coffeeAndMarketId = createTransaction(accountId, "Coffee Market");
    const bakeryId = createTransaction(accountId, "Local Bakery");
    const coffeeOnlyId = createTransaction(accountId, "Coffee Shop");
    const otherUserTransactionId = createTransaction(
      otherAccountId,
      "Coffee Market",
    );
    createSessionForUser(userId, "category-update-auto-token");

    const res = await categoryPatch(
      createPatchRequest(
        "category-update-auto-token",
        categoryId,
        JSON.stringify({ match_rules: "coffee, market\nbakery" }),
      ),
    );
    const body = await res.json();
    const transactionCategories = db
      .query("SELECT id, category_id FROM transactions")
      .all() as { id: number; category_id: number | null }[];
    const categoryByTransaction = new Map(
      transactionCategories.map(({ id, category_id }) => [id, category_id]),
    );

    expect(res.status).toBe(200);
    expect(categoryByTransaction.get(coffeeAndMarketId)).toBe(categoryId);
    expect(categoryByTransaction.get(bakeryId)).toBe(categoryId);
    expect(categoryByTransaction.get(coffeeOnlyId)).toBeNull();
    expect(categoryByTransaction.get(otherUserTransactionId)).toBeNull();
    expect(body.category.match_rules).toBe("coffee, market\nbakery");
  });

  it("updates match rules without changing the category name and allows clearing them", async () => {
    const userId = createUser();
    const categoryId = createCategory(userId);
    createSessionForUser(userId, "category-update-rules-token");

    const res = await categoryPatch(
      createPatchRequest(
        "category-update-rules-token",
        categoryId,
        JSON.stringify({ match_rules: "  grocery\nmarket  " }),
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.category.name).toBe("Groceries");
    expect(body.category.match_rules).toBe("grocery\nmarket");

    const emptyRulesRes = await categoryPatch(
      createPatchRequest(
        "category-update-rules-token",
        categoryId,
        JSON.stringify({ match_rules: "  " }),
      ),
    );
    const emptyRulesBody = await emptyRulesRes.json();

    expect(emptyRulesRes.status).toBe(200);
    expect(emptyRulesBody.category.match_rules).toBe("");
  });

  it("returns unauthorized when the request has no session", async () => {
    const res = await categoryPatch(
      createPatchRequest(null, 1, '{"name":"Food"}'),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects malformed or non-positive category IDs", async () => {
    const userId = createUser();
    createSessionForUser(userId, "category-update-id-token");

    for (const id of ["nope", "0", "-1", "1.5"]) {
      const res = await categoryPatch(
        createPatchRequest("category-update-id-token", id, '{"name":"Food"}'),
      );
      expect(res.status).toBe(400);
    }
  });

  it("rejects invalid JSON and non-object bodies", async () => {
    const userId = createUser();
    const categoryId = createCategory(userId);
    createSessionForUser(userId, "category-update-body-token");

    const malformedRes = await categoryPatch(
      createPatchRequest("category-update-body-token", categoryId, "{"),
    );
    expect(malformedRes.status).toBe(400);
    expect((await malformedRes.json()).error).toBe(
      "Request body must be valid JSON",
    );

    for (const body of ["null", "[]", '"name"']) {
      const res = await categoryPatch(
        createPatchRequest("category-update-body-token", categoryId, body),
      );
      expect(res.status).toBe(400);
    }
  });

  it("rejects an empty update and unsupported or invalid fields", async () => {
    const userId = createUser();
    const categoryId = createCategory(userId);
    createSessionForUser(userId, "category-update-fields-token");

    const invalidBodies = [
      '{"name":"   "}',
      '{"name":42}',
      '{"match_rules":null}',
      '{"unknown":"value"}',
    ];

    for (const body of invalidBodies) {
      const res = await categoryPatch(
        createPatchRequest("category-update-fields-token", categoryId, body),
      );
      expect(res.status).toBe(400);
    }

    const idOnlyRes = await categoryPatch(
      createPatchRequest("category-update-fields-token", categoryId, "{}"),
    );
    expect(idOnlyRes.status).toBe(400);
    expect((await idOnlyRes.json()).error).toBe(
      "At least one category field must be provided",
    );
  });

  it("does not update a category owned by another user", async () => {
    const ownerId = createUser();
    const categoryId = createCategory(ownerId);
    const otherUserId = db
      .query(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      )
      .run(
        "other-category-user",
        "other-category-update@example.com",
        "hash",
      ).lastInsertRowid;
    createSessionForUser(Number(otherUserId), "category-update-other-token");

    const res = await categoryPatch(
      createPatchRequest(
        "category-update-other-token",
        categoryId,
        '{"name":"Stolen"}',
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Category not found");
    expect(() => db.run("BEGIN")).not.toThrow();
    db.run("ROLLBACK");
    const category = db
      .query("SELECT name FROM categories WHERE id = ?")
      .get(categoryId) as { name: string };
    expect(category.name).toBe("Groceries");
  });

  it("rolls back category changes when transaction categorization fails", async () => {
    const userId = createUser();
    const categoryId = createCategory(userId);
    const accountId = createAccount(userId, "Checking");
    const transactionId = createTransaction(accountId, "Coffee Market");
    createSessionForUser(userId, "category-update-categorize-error-token");

    const originalPrepare = db.prepare.bind(db);
    db.prepare = ((sql: string) => {
      if (sql.includes("UPDATE transactions AS t")) {
        return {
          run: () => {
            throw new Error("forced transaction categorization failure");
          },
        };
      }
      return originalPrepare(sql);
    }) as typeof db.prepare;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      const res = await categoryPatch(
        createPatchRequest(
          "category-update-categorize-error-token",
          categoryId,
          '{"match_rules":"coffee"}',
        ),
      );
      const body = await res.json();
      const category = db
        .query("SELECT match_rules FROM categories WHERE id = ?")
        .get(categoryId) as { match_rules: string };
      const transaction = db
        .query("SELECT category_id FROM transactions WHERE id = ?")
        .get(transactionId) as { category_id: number | null };

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to update category");
      expect(category.match_rules).toBe("market");
      expect(transaction.category_id).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      db.prepare = originalPrepare;
      consoleErrorSpy.mockRestore();
    }
  });

  it("returns 500 when the category update query fails", async () => {
    const userId = createUser();
    const categoryId = createCategory(userId);
    createSessionForUser(userId, "category-update-error-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (sql.startsWith("UPDATE categories")) {
        throw new Error("forced category update failure");
      }
      return originalQuery(sql);
    }) as typeof db.query;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      const res = await categoryPatch(
        createPatchRequest(
          "category-update-error-token",
          categoryId,
          '{"match_rules":"market"}',
        ),
      );
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
