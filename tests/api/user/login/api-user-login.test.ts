import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import { POST as registerPost } from "@/app/api/user/register/route";
import { POST as loginPost } from "@/app/api/user/login/route";

describe("login endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("logs in a registered user and creates a session", async () => {
    await registerPost(
      new Request("http://localhost/api/user/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "bob",
          email: "bob@example.com",
          password: "secret123",
        }),
      })
    );

    const req = new Request("http://localhost/api/user/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "bob@example.com",
        password: "secret123",
      }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Login successful");
    expect(body.session?.token).toBeTruthy();
    expect(body.session?.expiresAt).toBeTruthy();
    expect(db.query("SELECT COUNT(*) as count FROM sessions").get()?.count).toBe(1);
  });

  it("rejects invalid login credentials", async () => {
    await registerPost(
      new Request("http://localhost/api/user/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "cara",
          email: "cara@example.com",
          password: "correct-password",
        }),
      })
    );

    const req = new Request("http://localhost/api/user/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "cara@example.com",
        password: "wrong-password",
      }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Invalid email or password");
  });

  it("requires email and password for login", async () => {
    const req = new Request("http://localhost/api/user/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "someone@example.com" }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Email and password are required");
  });

  it("returns 401 for a non-existent user", async () => {
    const req = new Request("http://localhost/api/user/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ghost@example.com",
        password: "secret123",
      }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Invalid email or password");
  });
});
