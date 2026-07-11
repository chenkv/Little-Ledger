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
        password: "secret123",
      }),
    });

    const res = await registerPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.message).toBe("User registered successfully");
    expect(db.query("SELECT COUNT(*) as count FROM users").get()?.count).toBe(1);
  });

  it("rejects duplicate registration emails", async () => {
    const firstReq = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "dana",
        email: "dana@example.com",
        password: "secret123",
      }),
    });

    const secondReq = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "dana-2",
        email: "dana@example.com",
        password: "secret123",
      }),
    });

    const firstRes = await registerPost(firstReq);
    const secondRes = await registerPost(secondReq);
    const body = await secondRes.json();

    expect(firstRes.status).toBe(201);
    expect(secondRes.status).toBe(409);
    expect(body.error).toBe("User with that email already exists");
  });

  it("requires email and password for registration", async () => {
    const req = new Request("http://localhost/api/user/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "noauth" }),
    });

    const res = await registerPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Email and password are required");
  });
});
