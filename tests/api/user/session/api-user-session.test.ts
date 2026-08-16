import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { GET as sessionGet } from "@/app/api/user/session/route";

function createUser(userSuffix = "") {
  const insertUser = db.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
  );
  const username = `user${userSuffix}`;
  const email = `user${userSuffix}@example.com`;
  const result = insertUser.run(username, email, "hash");
  return result.lastInsertRowid as number;
}

function createSession(userId: number, token: string, expiresAt: string) {
  const insertSession = db.query(
    "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)"
  );
  insertSession.run(userId, token, expiresAt);
}

describe("session endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("returns authenticated user when session token is valid", async () => {
    const userId = createUser("1");
    createSession(userId, "valid-session-token", new Date(Date.now() + 1000 * 60 * 60).toISOString());

    const req = new Request("http://localhost/api/user/session", {
      method: "GET",
      headers: {
        authorization: "Bearer valid-session-token",
      },
    });

    const res = await sessionGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: userId,
        username: `user1`,
        email: `user1@example.com`,
      },
    });
  });

  it("returns 401 when the session token is missing", async () => {
    const req = new Request("http://localhost/api/user/session", {
      method: "GET",
    });

    const res = await sessionGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when the session token is invalid", async () => {
    const userId = createUser("2");
    createSession(userId, "valid-session-token", new Date(Date.now() + 1000 * 60 * 60).toISOString());

    const req = new Request("http://localhost/api/user/session", {
      method: "GET",
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    const res = await sessionGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when the session exists but the user row is missing", async () => {
    const userId = createUser("3");
    createSession(userId, "valid-session-token", new Date(Date.now() + 1000 * 60 * 60).toISOString());

    const originalQuery = db.query.bind(db);
    (db as unknown as { query: any }).query = (sql: string) => {
      if (typeof sql === "string" && sql.includes("FROM users WHERE id = ?")) {
        return { get: () => null };
      }
      return originalQuery(sql);
    };

    try {
      const req = new Request("http://localhost/api/user/session", {
        method: "GET",
        headers: {
          authorization: "Bearer valid-session-token",
        },
      });

      const res = await sessionGet(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ error: "Unauthorized" });
    } finally {
      (db as unknown as { query: any }).query = originalQuery;
    }
  });

  it("returns 500 when an unexpected error occurs during user lookup", async () => {
    const userId = createUser("3");
    createSession(userId, "valid-session-token", new Date(Date.now() + 1000 * 60 * 60).toISOString());

    const originalQuery = db.query.bind(db);
    (db as unknown as { query: any }).query = (sql: string) => {
      if (typeof sql === "string" && sql.includes("FROM users WHERE id = ?")) {
        throw new Error("database failure");
      }
      return originalQuery(sql);
    };

    try {
      const req = new Request("http://localhost/api/user/session", {
        method: "GET",
        headers: {
          authorization: "Bearer valid-session-token",
        },
      });

      const res = await sessionGet(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ error: "Internal Server Error" });
    } finally {
      (db as unknown as { query: any }).query = originalQuery;
    }
  });
});
