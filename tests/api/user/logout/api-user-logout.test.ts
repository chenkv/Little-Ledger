import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { POST as registerPost } from "@/app/api/user/register/route";
import { POST as loginPost } from "@/app/api/user/login/route";
import { POST as logoutPost } from "@/app/api/user/logout/route";

describe("logout endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("logs out a logged-in user and clears session", async () => {
    // Register
    await registerPost(
      new Request("http://localhost/api/user/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "zack",
          email: "zack@example.com",
          password: "secret123!",
        }),
      })
    );

    // Login
    const loginRes = await loginPost(
      new Request("http://localhost/api/user/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "zack@example.com", password: "secret123!" }),
      })
    );

    const loginBody = await loginRes.json();
    expect(loginRes.status).toBe(200);
    const token = loginBody.session?.token;
    expect(token).toBeTruthy();

    // Ensure session exists
    expect(db.query("SELECT COUNT(*) as count FROM sessions").get()?.count).toBe(1);

    // Call logout with cookie header set
    const logoutReq = new Request("http://localhost/api/user/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `session_token=${token}`,
      },
    });

    const logoutRes = await logoutPost(logoutReq);
    const logoutBody = await logoutRes.json();

    

    expect(logoutRes.status).toBe(200);
    expect(logoutBody.message).toBe("Logged out");

    // Session should be removed from DB
    expect(db.query("SELECT COUNT(*) as count FROM sessions").get()?.count).toBe(0);
  });

  it("returns 500 when cookie header access throws", async () => {
    // Register and login to create a session
    await registerPost(
      new Request("http://localhost/api/user/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "will",
          email: "will@example.com",
          password: "secret123!",
        }),
      })
    );

    const loginRes = await loginPost(
      new Request("http://localhost/api/user/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "will@example.com", password: "secret123!" }),
      })
    );

    const loginBody = await loginRes.json();
    expect(loginRes.status).toBe(200);
    const token = loginBody.session?.token;
    expect(token).toBeTruthy();

    // Create a fake request whose headers.get throws to simulate unexpected error
    const badReq = { headers: { get: () => { throw new Error("boom"); } } } as unknown as Request;

    const res = await logoutPost(badReq);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });

  it("still returns 200 for non-existent session", async () => {
    const logoutReq = new Request("http://localhost/api/user/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `session_token=nonexistenttoken`,
      },
    });

    const logoutRes = await logoutPost(logoutReq);
    const logoutBody = await logoutRes.json();

    expect(logoutRes.status).toBe(200);
    expect(logoutBody.message).toBe("Logged out");
  });

  it("returns 400 for no session token", async () => {
    const logoutReq = new Request("http://localhost/api/user/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });

    const logoutRes = await logoutPost(logoutReq);
    const logoutBody = await logoutRes.json();

    expect(logoutRes.status).toBe(400);
    expect(logoutBody.error).toBe("No session token found");
  });

  it("returns 500 for failure to delete session", async () => {
    const originalQuery = db.query.bind(db);
    (db as unknown as { query: any }).query = (sql: string) => {
      if (typeof sql === "string" && sql.includes("DELETE FROM sessions")) {
        throw new Error("database failure");
      }
      return originalQuery(sql);
    };

    try {
      const logoutReq = new Request("http://localhost/api/user/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_token=sometoken`,
        },
      });

      const logoutRes = await logoutPost(logoutReq);
      const logoutBody = await logoutRes.json();

      expect(logoutRes.status).toBe(500);
      expect(logoutBody.error).toBe("Failed to log out");
    } finally {
      db.query = originalQuery;
    }
  });
});
