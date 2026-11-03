import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import {
  GET as financialAccountsGet,
  POST as financialAccountsPost,
} from "@/app/api/user/financial-accounts/route";

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
  const username = `account-user${suffix}`;
  const email = `account${suffix}@example.com`;
  const result = insertUser.run(username, email, "hash");
  return result.lastInsertRowid as number;
}

function getChaseInstitutionId() {
  const institution = db
    .query("SELECT id FROM financial_institutions WHERE name = ?")
    .get("Chase") as { id: number };
  return institution.id;
}

describe("financial accounts endpoint", () => {
  beforeEach(() => {
    db.run("DELETE FROM financial_accounts");
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("inserts financial accounts for an authenticated user", async () => {
    const userId = createUser();
    createSessionForUser(userId, "valid-account-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-account-token",
      },
      body: JSON.stringify([
        {
          name: "Checking",
          type: "checking",
          institution: String(getChaseInstitutionId()),
          description: "Primary account",
        },
        {
          name: "Savings",
          type: "savings",
          institution: String(getChaseInstitutionId()),
          description: "Rainy day",
        },
      ]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(Array.isArray(body.inserted)).toBe(true);
    expect(body.inserted.length).toBe(2);
    expect(body.inserted[0].name).toBe("Checking");
    expect(body.inserted[1].type).toBe("savings");
  });

  it("returns 401 when authorization is missing for POST", async () => {
    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when the POST body is not an array", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-body-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer invalid-body-token",
      },
      body: JSON.stringify({
        name: "Checking",
        type: "checking",
        institution: String(getChaseInstitutionId()),
        description: "Primary",
      }),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      "Request body must be an array of financial accounts",
    );
  });

  it("returns 400 when the POST account list is empty", async () => {
    const userId = createUser();
    createSessionForUser(userId, "empty-accounts-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer empty-accounts-token",
      },
      body: JSON.stringify([]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Financial account list cannot be empty");
  });

  it("returns 400 when a POST account item is invalid", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-account-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer invalid-account-token",
      },
      body: JSON.stringify([null]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Each financial account must be an object");
  });

  it("returns 400 when a POST account is missing a name", async () => {
    const userId = createUser();
    createSessionForUser(userId, "missing-name-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer missing-name-token",
      },
      body: JSON.stringify([
        {
          name: "",
          type: "checking",
          institution: String(getChaseInstitutionId()),
          description: "Primary account",
        },
      ]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("name is required for each financial account");
  });

  it("returns 400 when a POST account has an invalid institution ID", async () => {
    const userId = createUser();
    createSessionForUser(userId, "invalid-institution-id-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "session_token=invalid-institution-id-token",
      },
      body: JSON.stringify([
        {
          name: "Checking",
          type: "checking",
          institution: "not-an-id",
        },
      ]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      "A valid institution is required for each financial account",
    );
  });

  it("returns 400 when the POST institution ID does not exist", async () => {
    const userId = createUser();
    createSessionForUser(userId, "missing-institution-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "session_token=missing-institution-token",
      },
      body: JSON.stringify([
        {
          name: "Checking",
          type: "checking",
          institution: "999999",
        },
      ]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("The selected financial institution was not found");
  });

  it("returns 400 when a POST account is missing a type", async () => {
    const userId = createUser();
    createSessionForUser(userId, "missing-type-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer missing-type-token",
      },
      body: JSON.stringify([
        {
          name: "Checking",
          type: "",
          institution: String(getChaseInstitutionId()),
          description: "Primary account",
        },
      ]),
    });

    const res = await financialAccountsPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("type is required for each financial account");
  });

  it("returns 500 when financial account insertion throws an unexpected error", async () => {
    const userId = createUser();
    createSessionForUser(userId, "catch-account-token");

    const originalQuery = db.query.bind(db);
    const originalRun = db.run.bind(db);
    db.query = ((sql: string) => {
      if (
        typeof sql === "string" &&
        sql.startsWith("INSERT INTO financial_accounts")
      ) {
        return {
          run: () => {
            throw new Error("forced financial account insert failure");
          },
        };
      }
      return originalQuery(sql);
    }) as typeof db.query;
    db.run = ((sql: string) => {
      if (sql === "ROLLBACK") {
        throw new Error("forced rollback failure");
      }
      return originalRun(sql);
    }) as typeof db.run;
    const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});

    try {
      const req = new Request("http://localhost/api/user/financial-accounts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer catch-account-token",
        },
        body: JSON.stringify([
          {
            name: "Checking",
            type: "checking",
            institution: String(getChaseInstitutionId()),
            description: "Primary account",
          },
        ]),
      });

      const res = await financialAccountsPost(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Internal Server Error");
      expect(consoleWarnSpy).toHaveBeenCalled();
    } finally {
      db.query = originalQuery;
      db.run = originalRun;
      originalRun("ROLLBACK");
      consoleWarnSpy.mockRestore();
    }
  });

  it("returns 401 for GET when the authorization header is missing", async () => {
    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "GET",
    });

    const res = await financialAccountsGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns only financial accounts for the authenticated user", async () => {
    const user1 = createUser();
    createSessionForUser(user1, "account-user1-token");

    const user2 = createUser("-2");
    const insertAccount = db.query(
      "INSERT INTO financial_accounts (user_id, name, type, institution, description) VALUES (?, ?, ?, ?, ?)",
    );
    insertAccount.run(
      user1,
      "Checking",
      "checking",
      getChaseInstitutionId(),
      "Primary account",
    );
    insertAccount.run(
      user2,
      "Savings",
      "savings",
      getChaseInstitutionId(),
      "Rainy day",
    );

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "GET",
      headers: { authorization: "Bearer account-user1-token" },
    });

    const res = await financialAccountsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts.length).toBe(1);
    expect(body.accounts[0].name).toBe("Checking");
    expect(body.accounts[0].type).toBe("checking");
    expect(body.accounts[0].institution).toBe("Chase");
  });

  it("returns an empty account list when the user has no financial accounts", async () => {
    const userId = createUser("-3");
    createSessionForUser(userId, "empty-account-get-token");

    const req = new Request("http://localhost/api/user/financial-accounts", {
      method: "GET",
      headers: { authorization: "Bearer empty-account-get-token" },
    });

    const res = await financialAccountsGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts.length).toBe(0);
  });

  it("returns 500 when retrieving financial accounts fails", async () => {
    const userId = createUser("-retrieval-error");
    createSessionForUser(userId, "account-retrieval-error-token");

    const originalQuery = db.query.bind(db);
    db.query = ((sql: string) => {
      if (sql.includes("FROM financial_accounts")) {
        return {
          all: () => {
            throw new Error("forced financial account retrieval failure");
          },
        };
      }
      return originalQuery(sql);
    }) as typeof db.query;
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    try {
      const req = new Request("http://localhost/api/user/financial-accounts", {
        method: "GET",
        headers: { cookie: "session_token=account-retrieval-error-token" },
      });

      const res = await financialAccountsGet(req);
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
