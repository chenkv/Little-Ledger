import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { POST as registerPost } from "@/app/api/user/register/route";

describe("register endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("registers a new user", async () => {
    const req = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "alice",
        email: "alice@example.com",
        password: "secret123!",
      }),
    });

    const res = await registerPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.message).toBe("User registered successfully");

    const userCount = db.query("SELECT COUNT(*) as count FROM users").get() as {
      count: number;
    };
    expect(userCount.count).toBe(1);
  });

  it("rejects duplicate registration emails", async () => {
    const firstReq = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "dana",
        email: "dana@example.com",
        password: "secret123!",
      }),
    });

    const secondReq = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "dana-2",
        email: "dana@example.com",
        password: "secret123!",
      }),
    });

    const firstRes = await registerPost(firstReq);
    const secondRes = await registerPost(secondReq);
    const body = await secondRes.json();

    expect(firstRes.status).toBe(201);
    expect(secondRes.status).toBe(409);
    expect(body.error).toBe("User with that email already exists");
  });

  it("invalid registration data", async () => {
    const req = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "badEmail",
        username: "noauth",
        password: "short",
      }),
    });

    const res = await registerPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      `✖ Please enter a valid email.
  → at email
✖ Be at least 8 characters long
  → at password
✖ Contain at least one number.
  → at password
✖ Contain at least one special character.
  → at password`,
    );
  });

  it("returns 500 when user insert fails", async () => {
    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (sql.includes("INSERT INTO users")) {
        return {
          run: () => null,
        } as unknown as ReturnType<typeof db.query>;
      }

      return originalQuery(sql);
    }) as typeof db.query;

    try {
      const req = new Request("http://localhost/api/user/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "insert-fail",
          email: "insert-fail@example.com",
          password: "secret123!",
        }),
      });

      const res = await registerPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to register user");
    } finally {
      db.query = originalQuery;
    }
  });

  it("returns 500 for unexpected registration errors", async () => {
    const originalHash = Bun.password.hash;
    Bun.password.hash = async () => {
      throw new Error("boom");
    };

    try {
      const req = new Request("http://localhost/api/user/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "error-user",
          email: "error-user@example.com",
          password: "secret123!",
        }),
      });

      const res = await registerPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    } finally {
      Bun.password.hash = originalHash;
    }
  });
});
