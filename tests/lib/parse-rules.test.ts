import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

import * as userUtils from "@/app/api/user/utils";
import { runInTemporaryWorkingDirectory } from "@/tests/helpers/run-in-temporary-working-directory";
import {
  americanExpressCreditParse,
  chaseCreditParse,
  discoverCheckingParse,
  discoverCreditParse,
  getRule,
} from "@/lib/parse-rules";

let extractPdfTextSpy: ReturnType<typeof spyOn>;

const americanExpressPdf = [
  "Total Payments and Credits $0.00 -$10.00 -$10.00",
  "Total New Charges $0.00 $0.00 $45.50",
  "Detail *Indicates posting date",
  "08/01/26 Payment -$10.00",
  "New Charges Summary",
  "08/05/26 Some merchant $12.00",
  "08/06/26 Other merchant $33.50",
  "Fees",
].join("\n");

const discoverCheckingPdf = [
  "Statement Period: Jul 01, 2026",
  "Deposits and Credits....+$100.00",
  "ATM and Debit Card Withdrawals....-$10.00",
  "Electronic Withdrawals ....-$20.00",
  "ACCOUNT ACTIVITY Deposits and Credits",
  "Jul 02 Jul 02 Payroll 100.00",
  "TOTAL DEPOSITS AND CREDITS",
  "ATM and Debit Card Withdrawals Eff. Date Syst. Date Description Amount",
  "Jul 03 Jul 03 Store 10.00",
  "Jul 04 Jul 04 Utility 20.00",
  "TOTAL ELECTRONIC WITHDRAWALS",
].join("\n");

describe("statement parsing rules", () => {
  beforeEach(() => {
    extractPdfTextSpy?.mockRestore?.();
    extractPdfTextSpy = spyOn(userUtils, "extractPdfText").mockImplementation(
      async () => "",
    );
  });

  afterEach(() => {
    extractPdfTextSpy?.mockRestore?.();
  });

  it("normalizes American Express PDF payments, charges, and totals", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () => americanExpressPdf);

    await expect(
      americanExpressCreditParse(
        new Blob(["statement"], { type: "application/pdf" }),
      ),
    ).resolves.toEqual([
      { date: "08/01/26", description: "Payment", amount: "10.00" },
      { date: "08/05/26", description: "Some merchant", amount: "-12" },
      { date: "08/06/26", description: "Other merchant", amount: "-33.5" },
    ]);
  });

  it("rejects American Express PDF statements when totals do not match rows", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () =>
      americanExpressPdf.replace("$45.50", "$46.50"),
    );

    await expect(
      americanExpressCreditParse(
        new Blob(["statement"], { type: "application/pdf" }),
      ),
    ).rejects.toThrow("Unable to parse successfully");
  });

  it("normalizes signed amounts in American Express CSV statements", async () => {
    const csv = [
      "Date,Description,Amount",
      '08/05/2026,Some merchant,"1,234.56"',
      "08/06/2026,Refund,-4.50",
    ].join("\n");

    await expect(
      americanExpressCreditParse(new Blob([csv], { type: "text/csv" })),
    ).resolves.toEqual([
      { date: "08/05/2026", description: "Some merchant", amount: "-1234.56" },
      { date: "08/06/2026", description: "Refund", amount: "4.5" },
    ]);
  });

  it("rejects unsupported American Express file types", async () => {
    await expect(
      americanExpressCreditParse(
        new Blob(["statement"], { type: "application/json" }),
      ),
    ).rejects.toThrow("Unsupported file type, expected PDF or CSV");
  });

  it("normalizes the sign and amount of Discover PDF transactions", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () =>
        "Transactions\n05/01/26 05/02/26 Some merchant\n$ 1,234.56\n06/01/26 06/02/26 Refund\n$ -45.50\nStatement Balance is the total",
    );

    await expect(
      discoverCreditParse(new Blob(["statement"], { type: "application/pdf" })),
    ).resolves.toEqual([
      { date: "05/01/26", description: "Some merchant", amount: "-1234.56" },
      { date: "06/01/26", description: "Refund", amount: "45.5" },
    ]);
  });

  it("rejects malformed Discover credit CSV rows", async () => {
    const csv = [
      "Date,Post Date,Description,Amount,Category",
      "08/05/2026,08/06/2026,Some merchant,12.00,Shopping",
    ].join("\n");

    await expect(
      discoverCreditParse(new Blob([csv], { type: "text/csv" })),
    ).rejects.toThrow("Failed to parse a transaction row.");
  });

  it("rejects unsupported Discover file types", async () => {
    await expect(
      discoverCreditParse(
        new Blob(["statement"], { type: "application/json" }),
      ),
    ).rejects.toThrow("Unsupported file type, expected PDF or CSV");
  });

  it("parses Discover checking deposits and withdrawals and validates totals", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () => discoverCheckingPdf);

    await expect(
      discoverCheckingParse(
        new Blob(["statement"], { type: "application/pdf" }),
      ),
    ).resolves.toEqual([
      { date: "07/02/2026", description: "Payroll", amount: "100.00" },
      { date: "07/03/2026", description: "Store", amount: "-10.00" },
      { date: "07/04/2026", description: "Utility", amount: "-20.00" },
    ]);
  });

  it("rejects Discover checking statements with mismatched totals", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () =>
      discoverCheckingPdf.replace("Payroll 100.00", "Payroll 90.00"),
    );

    await expect(
      discoverCheckingParse(
        new Blob(["statement"], { type: "application/pdf" }),
      ),
    ).rejects.toThrow("Unable to parse successfully");
  });

  it("rejects Discover checking statements with missing summary data", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () => "Statement is empty");

    await expect(
      discoverCheckingParse(
        new Blob(["statement"], { type: "application/pdf" }),
      ),
    ).rejects.toThrow("Unable to parse successfully");
  });

  it("rejects unsupported Discover checking file types", async () => {
    await expect(
      discoverCheckingParse(new Blob(["statement"], { type: "text/csv" })),
    ).rejects.toThrow("Unsupported file type, expected PDF");
  });

  it("rejects Chase statements that are missing a statement period", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () => "No statement period");

    await expect(
      runInTemporaryWorkingDirectory(() =>
        chaseCreditParse(new Blob(["statement"], { type: "application/pdf" })),
      ),
    ).rejects.toThrow("Unable to parse file");
  });

  it("rejects Chase statements that are missing purchase totals", async () => {
    extractPdfTextSpy.mockImplementationOnce(
      async () => "Opening/Closing Date 08/01/26 - 08/31/26",
    );

    await expect(
      runInTemporaryWorkingDirectory(() =>
        chaseCreditParse(new Blob(["statement"], { type: "application/pdf" })),
      ),
    ).rejects.toThrow("Unable to parse total purchases");
  });

  it("rejects Chase statements when purchase totals do not match transactions", async () => {
    extractPdfTextSpy.mockImplementationOnce(async () =>
      [
        "Opening/Closing Date 08/01/26 - 08/31/26",
        "Purchases +$20.00",
        "Transaction Merchant Name",
        "08/05 Some merchant 12.00",
        "Year-to-date",
      ].join("\n"),
    );

    await expect(
      runInTemporaryWorkingDirectory(() =>
        chaseCreditParse(new Blob(["statement"], { type: "application/pdf" })),
      ),
    ).rejects.toThrow("Parsed payments total does not match expected total");
  });

  it("rejects unsupported Chase file types", async () => {
    await expect(
      chaseCreditParse(new Blob(["statement"], { type: "text/csv" })),
    ).rejects.toThrow("Unsupported file type, expected PDF");
  });

  it("returns parser rules only for supported institution and account types", () => {
    expect(getRule("Discover", "checking")).toBe(discoverCheckingParse);
    expect(getRule("Chase", "credit")).toBe(chaseCreditParse);
    expect(getRule()).toBeNull();
    expect(getRule("Discover")).toBeNull();
    expect(getRule("Unknown", "credit")).toBeNull();
    expect(getRule("Discover", "savings")).toBeNull();
  });
});
