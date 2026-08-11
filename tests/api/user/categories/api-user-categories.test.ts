import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { GET as categoriesGet, POST as categoriesPost } from "@/app/api/user/categories/route";

function createSessionForUser(userId: number, token: string) {
  const insertSession = db.query(
    "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)"
  );
  insertSession.run(userId, token, new Date(Date.now() + 1000 * 60 * 60).toISOString());
}

function createUser(suffix = "") {
  const insertUser = db.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
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
        { name: "Groceries", type: "expense" },
        { name: "Salary", type: "income" },
      ]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(Array.isArray(body.inserted)).toBe(true);
    expect(body.inserted.length).toBe(2);
    expect(body.inserted[0].name).toBe("Groceries");
    expect(body.inserted[1].type).toBe("income");
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
      body: JSON.stringify({ name: "Groceries", type: "expense" }),
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
      body: JSON.stringify([{ name: "Groceries", type: "" }]),
    });

    const res = await categoriesPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("name and type are required for each category");
  });

  it("returns 500 when category insertion throws an unexpected error", async () => {
    const userId = createUser();
    createSessionForUser(userId, "catch-category-token");

    const originalQuery = db.query.bind(db);
    (db as any).query = (sql: string) => {
      if (typeof sql === "string" && sql.startsWith("INSERT INTO categories")) {
        return { run: () => { throw new Error("forced category insert failure"); } };
      }
      return originalQuery(sql);
    };

    try {
      const req = new Request("http://localhost/api/user/categories", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer catch-category-token",
        },
        body: JSON.stringify([{ name: "Groceries", type: "expense" }]),
      });

      const res = await categoriesPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal Server Error");
    } finally {
      (db as any).query = originalQuery;
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
      "INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)"
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
    expect(body.categories[0].type).toBe("expense");
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
});
