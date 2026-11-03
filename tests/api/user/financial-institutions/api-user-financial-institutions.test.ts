import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { GET as financialInstitutionsGet } from "@/app/api/user/financial-institutions/route";

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
    .run("institution-user", "institution-user@example.com", "hash");
  return result.lastInsertRowid as number;
}

describe("financial institutions endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("returns 401 when authorization is missing", async () => {
    const req = new Request(
      "http://localhost/api/user/financial-institutions",
      { method: "GET" },
    );

    const res = await financialInstitutionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns financial institutions for an authenticated user", async () => {
    const userId = createUser();
    createSessionForUser(userId, "financial-institutions-token");

    const req = new Request(
      "http://localhost/api/user/financial-institutions",
      {
        method: "GET",
        headers: { cookie: "session_token=financial-institutions-token" },
      },
    );

    const res = await financialInstitutionsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.institutions).toContainEqual(
      expect.objectContaining({ name: "Chase" }),
    );
    expect(body.institutions).toContainEqual(
      expect.objectContaining({ name: "Discover" }),
    );
    expect(body.institutions).toContainEqual(
      expect.objectContaining({ name: "American Express" }),
    );
  });

  it("returns 500 when retrieving financial institutions fails", async () => {
    const userId = createUser();
    createSessionForUser(userId, "financial-institutions-error-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (sql.includes("FROM financial_institutions ORDER BY name")) {
        return {
          all: () => {
            throw new Error("forced financial institution retrieval failure");
          },
        };
      }
      return originalQuery(sql);
    }) as typeof db.query;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      const req = new Request(
        "http://localhost/api/user/financial-institutions",
        {
          method: "GET",
          headers: {
            cookie: "session_token=financial-institutions-error-token",
          },
        },
      );

      const res = await financialInstitutionsGet(req);
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
