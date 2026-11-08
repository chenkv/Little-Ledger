import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import * as userUtils from "@/app/api/user/utils";
import db from "@/lib/db";
import { chaseCreditParse } from "@/lib/parse-rules";
import { POST as parserPost } from "@/app/api/user/statements/parser/route";
import { runInTemporaryWorkingDirectory } from "@/tests/helpers/run-in-temporary-working-directory";

let getUserIdFromRequestSpy: ReturnType<typeof spyOn>;
let extractPdfTextSpy: ReturnType<typeof spyOn>;

describe("statement parser endpoint", () => {
  beforeEach(() => {
    getUserIdFromRequestSpy?.mockRestore?.();
    extractPdfTextSpy?.mockRestore?.();
    getUserIdFromRequestSpy = spyOn(
      userUtils,
      "getUserIdFromRequest",
    ).mockImplementation(async () => 1);
    extractPdfTextSpy = spyOn(userUtils, "extractPdfText").mockImplementation(
      async () => "",
    );
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserIdFromRequestSpy.mockImplementationOnce(async () => null);

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 415 when the request is not multipart/form-data", async () => {
    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(415);
    expect(body.error).toBe("Use multipart/form-data");
  });

  it("returns 400 when the form does not include a file", async () => {
    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing file");
  });

  it("returns 415 when the uploaded file is not a PDF or CSV", async () => {
    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/json" }),
      "statement.json",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(415);
    expect(body.error).toBe(
      "Unsupported file type. Please upload a PDF or CSV file.",
    );
  });

  it("returns 400 when the provided source has no parse rule", async () => {
    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "unknown-bank" }));
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No parsing rule found for the provided source");
  });

  it("parses a PDF statement using a mocked extractPdfText implementation", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Opening/Closing Date 08/01/26 - 08/31/26\nPurchases +$57.50\nTransaction Merchant Name\n08/05 Some merchant 12.00\n08/06 Another store 45.50\nYear-to-date",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await runInTemporaryWorkingDirectory(() => parserPost(req));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions.length).toBe(2);
    expect(body.transactions[0]).toEqual({
      date: "08/05/26",
      description: "Some merchant",
      amount: "-12",
      category_id: null,
    });
    expect(body.transactions[1]).toEqual({
      date: "08/06/26",
      description: "Another store",
      amount: "-45.5",
      category_id: null,
    });
  });

  it("parses an American Express PDF statement using a mocked extractPdfText implementation", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Total Payments and Credits $0.00 -$10.00 -$10.00\nTotal New Charges $0.00 $0.00 $45.50\nDetail *Indicates posting date\n08/01/26 Payment -$10.00\nNew Charges Summary\n08/05/26 Some merchant $12.00\n08/06/26 Other merchant $33.50\nFees",
    );

    const formData = new FormData();
    formData.set(
      "meta",
      JSON.stringify({ source: "American Express", type: "credit" }),
    );
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions.length).toBe(3);
    expect(body.transactions[0]).toEqual({
      date: "08/01/26",
      description: "Payment",
      amount: "10.00",
      category_id: null,
    });
    expect(body.transactions[1]).toEqual({
      date: "08/05/26",
      description: "Some merchant",
      amount: "-12",
      category_id: null,
    });
    expect(body.transactions[2]).toEqual({
      date: "08/06/26",
      description: "Other merchant",
      amount: "-33.5",
      category_id: null,
    });
  });

  it("parses a Discover PDF statement using a mocked extractPdfText implementation", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Transactions\n05/01/26 05/02/26 Some merchant\n$ 1,234.56\n06/01/26 06/02/26 Other merchant\n$ 45.50\nStatement Balance is the total",
    );

    const formData = new FormData();
    formData.set(
      "meta",
      JSON.stringify({ source: "Discover", type: "credit" }),
    );
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions.length).toBe(2);
    expect(body.transactions[0]).toEqual({
      date: "05/01/26",
      description: "Some merchant",
      amount: "-1234.56",
      category_id: null,
    });
    expect(body.transactions[1]).toEqual({
      date: "06/01/26",
      description: "Other merchant",
      amount: "-45.5",
      category_id: null,
    });
  });

  it("uses the statement period to assign Chase transaction years", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Opening/Closing Date 12/17/25 - 01/16/26\nPurchases +$150.00\nTransaction Merchant Name\n12/18 December merchant 100.00\n01/02 January merchant 50.00\nYear-to-date",
    );
    const transactions = await runInTemporaryWorkingDirectory(() =>
      chaseCreditParse(new Blob(["dummy"], { type: "application/pdf" })),
    );

    expect(transactions).toEqual([
      {
        date: "12/18/25",
        description: "December merchant",
        amount: "-100",
      },
      {
        date: "01/02/26",
        description: "January merchant",
        amount: "-50",
      },
    ]);
  });

  it("returns 400 when the PDF contains an invalid transaction row", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Opening/Closing Date 05/01/26 - 05/31/26\nPurchases +$15.30\nTransaction Merchant Name\n05/01bad Description 15.30\nYear-to-date",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await runInTemporaryWorkingDirectory(() => parserPost(req));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Failed to parse a transaction row.");
  });

  it("returns 400 when the PDF contains no parsable transaction rows", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Opening/Closing Date 05/01/26 - 05/31/26\nPurchases +$0.00\nTransaction Merchant Name\ninvalid-row-content\nYear-to-date",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));
    formData.set(
      "file",
      new Blob(["dummy"], { type: "application/pdf" }),
      "statement.pdf",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await runInTemporaryWorkingDirectory(() => parserPost(req));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe(
      "Unable to parse any transactions. Please check your input parameters.",
    );
  });

  it("parses a CSV statement for an institution with a CSV rule", async () => {
    const csvText = [
      "Date,Description,Amount",
      '08/05/2026,Some merchant,"1,234.56"',
      "08/06/2026,Other merchant,45.50",
    ].join("\n");

    const formData = new FormData();
    formData.set(
      "meta",
      JSON.stringify({ source: "American Express", type: "credit" }),
    );
    formData.set(
      "file",
      new Blob([csvText], { type: "text/csv" }),
      "statement.csv",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions.length).toBe(2);
    expect(body.transactions[0]).toEqual({
      date: "08/05/2026",
      description: "Some merchant",
      amount: "-1234.56",
      category_id: null,
    });
    expect(body.transactions[1]).toEqual({
      date: "08/06/2026",
      description: "Other merchant",
      amount: "-45.5",
      category_id: null,
    });
  });

  it("parses Discover credit CSV amounts with the transaction sign convention", async () => {
    const csvText = [
      "Date,Post Date,Description,Amount,Category",
      '08/05/2026,08/06/2026,"Some merchant","1,234.56","Shopping"',
      '08/07/2026,08/08/2026,"Payment","-4,567.89","Payment"',
    ].join("\n");

    const formData = new FormData();
    formData.set(
      "meta",
      JSON.stringify({ source: "Discover", type: "credit" }),
    );
    formData.set(
      "file",
      new Blob([csvText], { type: "text/csv" }),
      "statement.csv",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions).toEqual([
      {
        date: "08/05/2026",
        description: "Some merchant",
        amount: "-1234.56",
        category_id: null,
      },
      {
        date: "08/07/2026",
        description: "Payment",
        amount: "4567.89",
        category_id: null,
      },
    ]);
  });

  it("adds the matching category ID to each parsed transaction for the authenticated user", async () => {
    const userId = Number(
      db
        .query(
          "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        )
        .run("parser-category-user", "parser-category@example.com", "hash")
        .lastInsertRowid,
    );
    const insertCategory = db.query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    );
    const foodCategoryId = Number(
      insertCategory.run(userId, "Food", "coffee, shop\nbakery")
        .lastInsertRowid,
    );
    insertCategory.run(userId, "Coffee", "coffee, shop");

    const otherUserId = Number(
      db
        .query(
          "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        )
        .run("parser-other-user", "parser-other@example.com", "hash")
        .lastInsertRowid,
    );
    insertCategory.run(otherUserId, "Other", "uncategorized place");
    getUserIdFromRequestSpy.mockImplementationOnce(async () => userId);

    const csvText = [
      "Date,Post Date,Description,Amount,Category",
      '08/05/2026,08/06/2026,"COFFEE SHOP",12.00,"Shopping"',
      '08/07/2026,08/08/2026,"Local Bakery",20.00,"Food"',
      '08/09/2026,08/10/2026,"Uncategorized place",5.00,"Other"',
    ].join("\n");
    const formData = new FormData();
    formData.set(
      "meta",
      JSON.stringify({ source: "Discover", type: "credit" }),
    );
    formData.set(
      "file",
      new Blob([csvText], { type: "text/csv" }),
      "statement.csv",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions).toEqual([
      {
        date: "08/05/2026",
        description: "COFFEE SHOP",
        amount: "-12",
        category_id: foodCategoryId,
      },
      {
        date: "08/07/2026",
        description: "Local Bakery",
        amount: "-20",
        category_id: foodCategoryId,
      },
      {
        date: "08/09/2026",
        description: "Uncategorized place",
        amount: "-5",
        category_id: null,
      },
    ]);
  });

  it("rejects CSV uploads for Chase credit statements", async () => {
    const csvText = [
      "Date,Description,Amount",
      "08/05/2026,Some merchant,12.00",
      "08/06/2026,Other merchant,45.50",
    ].join("\n");

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "Chase", type: "credit" }));
    formData.set(
      "file",
      new Blob([csvText], { type: "text/csv" }),
      "statement.csv",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Unsupported file type, expected PDF");
  });

  it("fail to parse CSV row", async () => {
    const csvText = [
      "Date,Description,Amount",
      "08/05/2026,Some merchant,12.00",
      "08/06/2026,Other merchant,45.50",
    ].join("\n");

    const formData = new FormData();
    formData.set(
      "meta",
      JSON.stringify({ source: "Discover", type: "credit" }),
    );
    formData.set(
      "file",
      new Blob([csvText], { type: "text/csv" }),
      "statement.csv",
    );

    const req = new Request("http://localhost/api/user/statements/parser", {
      method: "POST",
      body: formData,
    });

    const res = await parserPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Failed to parse a transaction row.");
  });
});
