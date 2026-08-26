import { beforeEach, describe, expect, it } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import db from "@/lib/db";
import * as utils from "@/app/api/user/utils";

function createPdfArrayBuffer(text: string): ArrayBuffer {
  const pdfSource = `%PDF-1.1\r\n1 0 obj\r\n<< /Type /Catalog /Pages 2 0 R >>\r\nendobj\r\n2 0 obj\r\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\r\nendobj\r\n3 0 obj\r\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\r\nendobj\r\n4 0 obj\r\n<< /Length ${text.length + 55} >>\r\nstream\r\nBT /F1 24 Tf 72 712 Td (${text}) Tj ET\r\nendstream\r\nendobj\r\n5 0 obj\r\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\r\nendobj\r\nxref\r\n0 6\r\n0000000000 65535 f \r\n0000000010 00000 n \r\n0000000062 00000 n \r\n0000000111 00000 n \r\n0000000224 00000 n \r\n0000000315 00000 n \r\ntrailer\r\n<< /Size 6 /Root 1 0 R >>\r\nstartxref\r\n395\r\n%%EOF`;
  const buffer = Buffer.from(pdfSource, "binary");
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

describe("user utils", () => {
  beforeEach(() => {
    db.run("DELETE FROM sessions");
    db.run("DELETE FROM users");
  });

  it("returns null when authorization header is missing", async () => {
    const req = new Request("http://localhost", { method: "GET" });
    const result = await utils.getUserIdFromRequest(req);
    expect(result).toBeNull();
  });

  it("returns null when authorization header is malformed", async () => {
    const req = new Request("http://localhost", {
      method: "GET",
      headers: { authorization: "Token abc" },
    });

    const result = await utils.getUserIdFromRequest(req);
    expect(result).toBeNull();
  });

  it("returns null for no provided token", async () => {
    const req = new Request("http://localhost", {
      method: "GET",
      headers: { authorization: "Bearer   " },
    });

    const result = await utils.getUserIdFromRequest(req);
    expect(result).toBeNull();
  });

  it("returns null for an expired session token", async () => {
    const insertUser = db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    );
    const userResult = insertUser.run("expired", "expired@example.com", "hash");
    const userId = userResult.lastInsertRowid as number;

    const insertSession = db.query(
      "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
    );
    insertSession.run(
      userId,
      "expired-token",
      new Date(Date.now() - 1000).toISOString(),
    );

    const req = new Request("http://localhost", {
      method: "GET",
      headers: { authorization: "Bearer expired-token" },
    });

    const result = await utils.getUserIdFromRequest(req);
    expect(result).toBeNull();
  });

  it("returns null for a non-existent session token", async () => {
    const req = new Request("http://localhost", {
      method: "GET",
      headers: { authorization: "Bearer non-existent-token" },
    });

    const result = await utils.getUserIdFromRequest(req);
    expect(result).toBeNull();
  });

  it("returns the user id for a valid session token", async () => {
    const insertUser = db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    );
    const userResult = insertUser.run("valid", "valid@example.com", "hash");
    const userId = userResult.lastInsertRowid as number;

    const insertSession = db.query(
      "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
    );
    insertSession.run(
      userId,
      "valid-token",
      new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    );

    const req = new Request("http://localhost", {
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });

    const result = await utils.getUserIdFromRequest(req);
    expect(result).toBe(userId);
  });

  it("returns null when session_token cookie is missing", async () => {
    const req = new Request("http://localhost", {
      method: "GET",
    });

    const result = await utils.getUserIdFromRequest(req);

    expect(result).toBeNull();
  });

  it("returns null when session_token cookie does not match a session", async () => {
    const req = new Request("http://localhost", {
      method: "GET",
      headers: {
        cookie: "session_token=non-existent-cookie-token",
      },
    });

    const result = await utils.getUserIdFromRequest(req);

    expect(result).toBeNull();
  });

  it("returns null when session_token cookie contains an expired session", async () => {
    const insertUser = db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    );

    const userResult = insertUser.run(
      "cookie-expired",
      "cookie-expired@example.com",
      "hash",
    );

    const userId = userResult.lastInsertRowid as number;

    const insertSession = db.query(
      "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
    );

    insertSession.run(
      userId,
      "cookie-expired-token",
      new Date(Date.now() - 1000).toISOString(),
    );

    const req = new Request("http://localhost", {
      method: "GET",
      headers: {
        cookie: "session_token=cookie-expired-token",
      },
    });

    const result = await utils.getUserIdFromRequest(req);

    expect(result).toBeNull();
  });

  it("returns the user id for a valid session_token cookie", async () => {
    const insertUser = db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    );

    const userResult = insertUser.run(
      "cookie-valid",
      "cookie-valid@example.com",
      "hash",
    );

    const userId = userResult.lastInsertRowid as number;

    const insertSession = db.query(
      "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
    );

    insertSession.run(
      userId,
      "cookie-valid-token",
      new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    );

    const req = new Request("http://localhost", {
      method: "GET",
      headers: {
        cookie: "session_token=cookie-valid-token",
      },
    });

    const result = await utils.getUserIdFromRequest(req);

    expect(result).toBe(userId);
  });

  it("falls back to bearer authorization when session_token cookie is missing", async () => {
    const insertUser = db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    );

    const userResult = insertUser.run(
      "bearer-fallback",
      "bearer-fallback@example.com",
      "hash",
    );

    const userId = userResult.lastInsertRowid as number;

    const insertSession = db.query(
      "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
    );

    insertSession.run(
      userId,
      "bearer-fallback-token",
      new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    );

    const req = new Request("http://localhost", {
      method: "GET",
      headers: {
        authorization: "Bearer bearer-fallback-token",
      },
    });

    const result = await utils.getUserIdFromRequest(req);

    expect(result).toBe(userId);
  });

  it("prefers the session_token cookie over bearer authorization", async () => {
    const insertUser = db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    );

    const cookieUserResult = insertUser.run(
      "cookie-user",
      "cookie-user@example.com",
      "hash",
    );

    const cookieUserId = cookieUserResult.lastInsertRowid as number;

    const bearerUserResult = insertUser.run(
      "bearer-user",
      "bearer-user@example.com",
      "hash",
    );

    const bearerUserId = bearerUserResult.lastInsertRowid as number;

    const insertSession = db.query(
      "INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
    );

    insertSession.run(
      cookieUserId,
      "cookie-token",
      new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    );

    insertSession.run(
      bearerUserId,
      "bearer-token",
      new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    );

    const req = new Request("http://localhost", {
      method: "GET",
      headers: {
        cookie: "session_token=cookie-token",
        authorization: "Bearer bearer-token",
      },
    });

    const result = await utils.getUserIdFromRequest(req);

    expect(result).toBe(cookieUserId);
  });

  it("extracts text from a minimal PDF buffer", async () => {
    const buffer = createPdfArrayBuffer("Hello");
    const extracted = await utils.extractPdfText(buffer);
    expect(typeof extracted).toBe("string");
    expect(extracted.trim().length).toBeGreaterThan(0);
  });
});
