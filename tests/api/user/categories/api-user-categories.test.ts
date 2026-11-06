import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import {
  DELETE as categoriesDelete,
  GET as categoriesGet,
  POST as categoriesPost,
} from "@/app/api/user/categories/route";

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
  const username = `category-user${suffix}`;
  const email = `category${suffix}@example.com`;
  const result = insertUser.run(username, email, "hash");
  return result.lastInsertRowid as number;
}

describe("categories endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM categories");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("inserts categories for an authenticated user", async () => {
    const userId = createUser();
    createSessionForUser(userId, "valid-category-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-category-token",
      },
      body: JSON.stringify([
        { name: "Groceries", match_rules: "expense" },
        { name: "Salary", match_rules: "income" },
      ]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(Array.isArray(body.inserted)).toBe(true);
    expect(body.inserted.length).toBe(2);
    expect(body.inserted[0].name).toBe("Groceries");
    expect(body.inserted[1].match_rules).toBe("income");
  });

  it("returns 401 when authorization is missing for POST", async () => {
    const req = new Request("http://localhost/api/user/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when the POST body is not an array", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-body-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer invalid-body-token",
      },
      body: JSON.stringify({ name: "Groceries", match_rules: "expense" }),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Request body must be an array of categories");
  });

  it("returns 400 when the POST category list is empty", async () => {
    const userId = createUser();
    createSessionForUser(userId, "empty-categories-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer empty-categories-token",
      },
      body: JSON.stringify([]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Category list cannot be empty");
  });

  it("returns 400 when a POST category item is invalid", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-category-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer invalid-category-token",
      },
      body: JSON.stringify([null]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Each category must be an object");
  });

  it("returns 400 when a POST category is missing required fields", async () => {
    const userId = createUser();
    createSessionForUser(userId, "missing-fields-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer missing-fields-token",
      },
      body: JSON.stringify([{ name: "", match_rules: "" }]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("name is required for each category");
  });

  it("returns 500 when category insertion throws an unexpected error", async () => {
    const userId = createUser();
    createSessionForUser(userId, "catch-category-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (typeof sql === "string" && sql.startsWith("INSERT INTO categories")) {
        return {
          run: () => {
            throw new Error("forced category insert failure");
          },
        };
      }
      return originalQuery(sql);
    }) as typeof db.query;

    try {
      const req = new Request("http://localhost/api/user/categories", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer catch-category-token",
        },
        body: JSON.stringify([{ name: "Groceries", match_rules: "expense" }]),
      });

      const res = await categoriesPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal Server Error");
    } finally {
      db.query = originalQuery;
    }
  });

  it("returns 401 for GET when the authorization header is missing", async () => {
    const req = new Request("http://localhost/api/user/categories", {
      method: "GET",
    });

    const res = await categoriesGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns only categories for the authenticated user", async () => {
    const user1 = createUser();
    createSessionForUser(user1, "category-user1-token");

    const user2 = createUser("-2");
    const insertCategory = db.query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    );
    insertCategory.run(user1, "Personal", "expense");
    insertCategory.run(user2, "Business", "income");

    const req = new Request("http://localhost/api/user/categories", {
      method: "GET",
      headers: { authorization: "Bearer category-user1-token" },
    });

    const res = await categoriesGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body.categories.length).toBe(1);
    expect(body.categories[0].name).toBe("Personal");
    expect(body.categories[0].match_rules).toBe("expense");
  });

  it("returns an empty category list when the user has no categories", async () => {
    const userId = createUser();
    createSessionForUser(userId, "empty-category-get-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "GET",
      headers: { authorization: "Bearer empty-category-get-token" },
    });

    const res = await categoriesGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body.categories.length).toBe(0);
  });

  it("deletes multiple categories belonging to the authenticated user", async () => {
    const userId = createUser();
    const otherUserId = createUser("-other");
    createSessionForUser(userId, "category-delete-token");
    const insertCategory = db.query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    );
    const firstId = Number(
      insertCategory.run(userId, "Food", "market").lastInsertRowid,
    );
    const secondId = Number(
      insertCategory.run(userId, "Bills", "utility").lastInsertRowid,
    );
    const otherUserIdCategory = Number(
      insertCategory.run(otherUserId, "Private", "secret").lastInsertRowid,
    );

    const req = new Request("http://localhost/api/user/categories", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: "session_token=category-delete-token",
      },
      body: JSON.stringify([firstId, secondId]),
    });

    const res = await categoriesDelete(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Categories deleted successfully");
    expect(
      db.query("SELECT id FROM categories WHERE user_id = ?").all(userId),
    ).toEqual([]);
    expect(
      db
        .query("SELECT id FROM categories WHERE id = ?")
        .get(otherUserIdCategory),
    ).toBeDefined();
  });

  it("returns 401 when authorization is missing for DELETE", async () => {
    const req = new Request("http://localhost/api/user/categories", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([1]),
    });

    const res = await categoriesDelete(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects DELETE bodies that are not arrays", async () => {
    const userId = createUser();
    createSessionForUser(userId, "category-delete-invalid-body-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: "session_token=category-delete-invalid-body-token",
      },
      body: JSON.stringify({ id: 1 }),
    });

    const res = await categoriesDelete(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Request body must be an array of category IDs");
  });

  it("rejects empty or invalid DELETE category IDs", async () => {
    const userId = createUser();
    createSessionForUser(userId, "category-delete-ids-token");

    for (const [ids, expectedError] of [
      [[], "No valid category IDs provided"],
      [[0], "No valid category IDs provided"],
      [[1, 0], "Each category ID must be a positive integer"],
      [[1, "2"], "Each category ID must be a positive integer"],
      [[Number.MAX_SAFE_INTEGER + 1], "No valid category IDs provided"],
      [
        [1, Number.MAX_SAFE_INTEGER + 1],
        "Each category ID must be a positive integer",
      ],
    ] as const) {
      const req = new Request("http://localhost/api/user/categories", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: "session_token=category-delete-ids-token",
        },
        body: JSON.stringify(ids),
      });

      const res = await categoriesDelete(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe(expectedError);
    }
  });

  it("returns 404 when no requested categories belong to the user", async () => {
    const userId = createUser();
    createSessionForUser(userId, "category-delete-missing-token");

    const req = new Request("http://localhost/api/user/categories", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: "session_token=category-delete-missing-token",
      },
      body: JSON.stringify([999999]),
    });

    const res = await categoriesDelete(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Categories not found");
  });

  it("returns 500 when deleting categories fails", async () => {
    const userId = createUser();
    createSessionForUser(userId, "category-delete-error-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (sql.startsWith("DELETE FROM categories WHERE id IN")) {
        throw new Error("forced category deletion failure");
      }
      return originalQuery(sql);
    }) as typeof db.query;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      const req = new Request("http://localhost/api/user/categories", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          cookie: "session_token=category-delete-error-token",
        },
        body: JSON.stringify([1]),
      });

      const res = await categoriesDelete(req);
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
