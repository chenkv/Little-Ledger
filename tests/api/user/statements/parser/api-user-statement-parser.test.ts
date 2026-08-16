import { beforeEach, describe, expect, it, spyOn } from "bun:test";

process.env.LEDGER_DB_PATH = ":memory:";

import * as userUtils from "@/app/api/user/utils";
import { POST as parserPost } from "@/app/api/user/statements/parser/route";

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
    formData.set("meta", JSON.stringify({ source: "chase" }));
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
    formData.set("meta", JSON.stringify({ source: "chase" }));

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
    formData.set("meta", JSON.stringify({ source: "chase" }));
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
        "Transaction Merchant Name\n08/05 Some merchant 12.00\n08/06 Another store 45.50\nYear-to-date",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "chase" }));
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
      date: "08/05",
      description: "Some merchant",
      amount: "12.00",
    });
    expect(body.transactions[1]).toEqual({
      date: "08/06",
      description: "Another store",
      amount: "45.50",
    });
  });

  it("parses an American Express PDF statement using a mocked extractPdfText implementation", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "New Charges\n08/05/26  Some merchant  $12.00\n08/06/26  Other merchant  $45.50\nSummary\nFees",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "american-express" }));
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
      date: "08/05/26",
      description: "Some merchant",
      amount: "12.00",
    });
    expect(body.transactions[1]).toEqual({
      date: "08/06/26",
      description: "Other merchant",
      amount: "45.50",
    });
  });

  it("parses a Discover PDF statement using a mocked extractPdfText implementation", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Transactions\n05/01/26 05/02/26 Some merchant\n$ 12.00\n06/01/26 06/02/26 Other merchant\n$ 45.50\nStatement Balance is the total",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "discover" }));
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
      amount: "12.00",
    });
    expect(body.transactions[1]).toEqual({
      date: "06/01/26",
      description: "Other merchant",
      amount: "45.50",
    });
  });

  it("returns 400 when the PDF contains an invalid transaction row", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Transaction Merchant Name\n05/01/02 Description $ 15.30\nYear-to-date",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "discover" }));
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
    expect(body.error).toBe("Failed to parse a transaction row.");
  });

  it("returns 400 when the PDF contains no parsable transaction rows", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Transaction Merchant Name\ninvalid-row-content\nYear-to-date",
    );

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "chase" }));
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
    expect(body.message).toBe(
      "Unable to parse any transactions. Please check your input parameters.",
    );
  });

  it("parses a CSV statement for an institution with a CSV rule", async () => {
    const csvText = [
      "Date,Description,Amount",
      "08/05/2026,Some merchant,12.00",
      "08/06/2026,Other merchant,45.50",
    ].join("\n");

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "american-express" }));
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
      amount: "12.00",
    });
    expect(body.transactions[1]).toEqual({
      date: "08/06/2026",
      description: "Other merchant",
      amount: "45.50",
    });
  });

  it("invalid CSV parser rule for source", async () => {
    const csvText = [
      "Date,Description,Amount",
      "08/05/2026,Some merchant,12.00",
      "08/06/2026,Other merchant,45.50",
    ].join("\n");

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "chase" }));
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

    expect(res.status).toBe(500);
    expect(body.error).toBe(
      "No CSV parsing rule defined for the provided source",
    );
  });

  it("fail to parse CSV row", async () => {
    const csvText = [
      "Date,Description,Amount",
      "08/05/2026,Some merchant,12.00",
      "08/06/2026,Other merchant,45.50",
    ].join("\n");

    const formData = new FormData();
    formData.set("meta", JSON.stringify({ source: "discover" }));
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
