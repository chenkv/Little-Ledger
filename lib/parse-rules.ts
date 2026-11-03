import {
  defaultFinancialInstitutions,
  type DefaultFinancialInstitution,
  statementAccountTypes,
  type StatementAccountType,
} from "./financial-constants";
import { extractPdfText } from "@/app/api/user/utils";

function isStatementAccountType(type: string): type is StatementAccountType {
  return statementAccountTypes.some((accountType) => accountType === type);
}

function isDefaultFinancialInstitution(
  source: string,
): source is DefaultFinancialInstitution {
  return defaultFinancialInstitutions.some(
    (institution) => institution === source,
  );
}

type ParsedTransaction = {
  date: string;
  description: string;
  amount: string;
};

type StatementParser = (file: Blob) => Promise<ParsedTransaction[]>;

function normalizeAmount(value: string): string {
  return value.trim().replaceAll(",", "");
}

function sumMoney(amounts: string[]): number {
  const totalCents = amounts.reduce(
    (sum, amount) => sum + Math.round(Number(amount) * 100),
    0,
  );

  return totalCents / 100;
}

export async function americanExpressCreditParse(
  file: Blob,
): Promise<ParsedTransaction[]> {
  const transactions = [];

  if (file.type.includes("application/pdf")) {
    const extractedText = await extractPdfText(await file.arrayBuffer());

    const totalPaymentsText = extractedText.match(
      /Total Payments and Credits \$[\d,]*?\.\d{2} -\$[\d,]*?\.\d{2} -\$([\d,]*?\.\d{2})/,
    );
    const totalChargesText = extractedText.match(
      /Total New Charges \$[\d,]*?\.\d{2} \$[\d,]*?\.\d{2} \$([\d,]*?\.\d{2})/,
    );
    if (!totalPaymentsText || !totalChargesText) {
      console.warn("Unable to find totals");
      throw new Error("Unable to parse successfully");
    }
    const totalPayments = Number(normalizeAmount(totalPaymentsText[1]));
    const totalCharges = Number(normalizeAmount(totalChargesText[1])) * -1;

    // Get credits and payments first
    const paymentsMatch = extractedText.match(
      /Detail \*Indicates posting date([\s\S]*?)New Charges/,
    );

    if (!paymentsMatch) throw new Error("Unable to parse file");

    const paymentsRows =
      paymentsMatch[1].match(/\d{2}\/\d{2}\/\d{2}[\s\S]*?\$[\d,]+\.\d{2}/g) ||
      [];

    for (const row of paymentsRows) {
      const match = row.match(
        /(\d{2}\/\d{2}\/\d{2})[\s]*?([\s\S]*?)-\$([\d,]+\.\d{2})/i,
      );
      if (match) {
        const date = match[1];
        const description = match[2].trim().replace(/\s+/g, " ");
        const amount = normalizeAmount(match[3]);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }

    const sectionMatch = extractedText.match(
      /New Charges[\s]*?Summary([\s\S]*?)Fees/i,
    );
    const section = sectionMatch ? sectionMatch[1] : extractedText;

    const transactionRows =
      section.match(/\d{2}\/\d{2}\/\d{2}[\s\S]*?\$[\d,]+\.\d{2}/g) || [];

    for (const row of transactionRows) {
      const match = row.match(
        /(\d{2}\/\d{2}\/\d{2})[\s]*?([\s\S]*?)\$([\d,]+\.\d{2})/i,
      );
      if (match) {
        const date = match[1];
        const description = match[2].trim().replace(/\s+/g, " ");
        const amount = String(Number(normalizeAmount(match[3])) * -1);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }

    const parsedPaymentsTotal = sumMoney(
      transactions.filter((t) => Number(t.amount) > 0).map((t) => t.amount),
    );
    const parsedChargesTotal = sumMoney(
      transactions.filter((t) => Number(t.amount) < 0).map((t) => t.amount),
    );

    if (
      totalPayments !== parsedPaymentsTotal ||
      totalCharges !== parsedChargesTotal
    ) {
      console.warn(
        "Parsed transactions did not add up the total, maybe a transaction row was wrong/missing?\n" +
          "Parsed payment total: " +
          parsedPaymentsTotal +
          "\nParsed charges total: " +
          parsedChargesTotal +
          "\nActual payment total: " +
          totalPayments +
          "\nActual charges total: " +
          totalCharges,
      );
      throw new Error("Unable to parse successfully");
    }
  } else if (file.type.includes("text/csv")) {
    const csvText = await file.text();
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1);

    for (const row of lines) {
      const match = row.match(
        /^(\d{2}\/\d{2}\/\d{4}),([\s\S]*?),"?(-?[\d,]+\.\d{2})"?$/i,
      );
      if (match) {
        const date = match[1].trim();
        const description = match[2].trim();
        const amount = String(Number(normalizeAmount(match[3])) * -1);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse CSV row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }
  } else {
    throw new Error("Unsupported file type, expected PDF or CSV");
  }

  return transactions;
}

export async function discoverCreditParse(
  file: Blob,
): Promise<ParsedTransaction[]> {
  const transactions = [];

  if (file.type.includes("application/pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const extractedText = await extractPdfText(arrayBuffer);

    const sectionMatch = extractedText.match(
      /Transactions([\s\S]*?)Statement Balance is the total/i,
    );
    const section = sectionMatch ? sectionMatch[1] : extractedText;

    const transactionRows =
      section.match(
        /\d{2}\/\d{2}\/\d{2}(?:(?!^\d{2}\/\d{2}\/\d{2})[\s\S])*?\$ [\d,-]+\.\d{2}/gm,
      ) || [];

    for (const row of transactionRows) {
      const match = row.match(
        /(\d{2}\/\d{2}\/\d{2})[\s]+(?:\d{2}\/\d{2}\/\d{2})([\s\S]*?)\$[\s]+([\d,-]+.\d{2})/i,
      );
      if (match) {
        const date = match[1];
        const description = match[2].trim().replace(/\s+/g, " ");
        const amount = String(Number(normalizeAmount(match[3])) * -1);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }
  } else if (file.type.includes("text/csv")) {
    const csvText = await file.text();
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const csvLines = lines.slice(1);

    for (const row of csvLines) {
      const match = row.match(
        /^(\d{2}\/\d{2}\/\d{4}),(?:\d{2}\/\d{2}\/\d{4}),"([\s\S]*?)","?(-?[\d,]+\.\d{2})"?,"([\s\S]*?)"$/i,
      );
      if (match) {
        const date = match[1].trim();
        const description = match[2].trim();
        const amount = String(Number(normalizeAmount(match[3])) * -1);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse CSV row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }
  } else {
    throw new Error("Unsupported file type, expected PDF or CSV");
  }

  return transactions;
}

export async function discoverCheckingParse(
  file: Blob,
): Promise<ParsedTransaction[]> {
  function formatDate(dateString: string, year: string) {
    const date = new Date(`${dateString} ${year}`);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${month}/${day}/${year}`;
  }

  const transactions = [];

  if (file.type.includes("application/pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const extractedText = await extractPdfText(arrayBuffer);

    const yearText = extractedText.match(
      /Statement Period: \S{3} \d{2}, (\d{4})/,
    );
    const totalDepositsText = extractedText.match(
      /Deposits and Credits\.*?\+\$([\d,]+\.\d{2})/,
    );
    const totalWithdrawalsText1 = extractedText.match(
      /ATM and Debit Card Withdrawals\.*?\-\$([\d,]+\.\d{2})/,
    );
    const totalWithdrawalsText2 = extractedText.match(
      /Electronic Withdrawals \.*?\-\$([\d,]+\.\d{2})/,
    );
    if (
      !yearText ||
      !totalDepositsText ||
      !totalWithdrawalsText1 ||
      !totalWithdrawalsText2
    ) {
      console.warn("Unable to find totals");
      throw new Error("Unable to parse successfully");
    }

    const year = yearText[1];
    const totalDeposits = Number(normalizeAmount(totalDepositsText[1]));
    const totalWithdrawals =
      (Number(normalizeAmount(totalWithdrawalsText1[1])) +
        Number(normalizeAmount(totalWithdrawalsText2[1]))) *
      -1;

    // Get deposits into the account first
    const depositsSection = extractedText.match(
      /ACCOUNT ACTIVITY[\s]*?Deposits and Credits([\s\S]*?)TOTAL DEPOSITS AND CREDITS/,
    );

    if (!depositsSection) throw new Error("Unable to parse successfully");

    const depositRows =
      depositsSection[1].match(/[\S]{3}\s\d{2}\s[\s\S]*?\s[\d,]+\.\d{2}/g) ||
      [];
    for (const row of depositRows) {
      const match = row.match(
        /([\S]{3}\s\d{2})\s[\S]{3}\s\d{2}\s([\s\S]*?)\s([\d,]+\.\d{2})/,
      );

      if (match) {
        const date = formatDate(match[1], year);
        const description = match[2].trim().replace(/\s+/g, " ");
        const amount = normalizeAmount(match[3]);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }

    // Get withdrawals from the account next
    const withdrawalsSection = extractedText.match(
      /ATM and Debit Card Withdrawals\sEff\. Date Syst\. Date Description Amount([\s\S]*?)TOTAL ELECTRONIC WITHDRAWALS/,
    );

    if (!withdrawalsSection) throw new Error("Unable to parse successfully");

    const withdrawalRows =
      withdrawalsSection[1].match(/[\S]{3}\s\d{2}\s[\s\S]*?\s[\d,]+\.\d{2}/g) ||
      [];
    for (const row of withdrawalRows) {
      const match = row.match(
        /([\S]{3}\s\d{2})\s[\S]{3}\s\d{2}\s([\s\S]*?)\s([\d,]+\.\d{2})/,
      );

      if (match) {
        const date = formatDate(match[1], year);
        const description = match[2].trim().replace(/\s+/g, " ");
        const amount = "-" + normalizeAmount(match[3]);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }

    const parsedDepositTotal = sumMoney(
      transactions.filter((t) => Number(t.amount) > 0).map((t) => t.amount),
    );
    const parsedWithdrawalTotal = sumMoney(
      transactions.filter((t) => Number(t.amount) < 0).map((t) => t.amount),
    );

    if (
      parsedDepositTotal !== totalDeposits ||
      parsedWithdrawalTotal !== totalWithdrawals
    ) {
      console.warn(
        "Parsed transactions did not add up the total, maybe a transaction row was wrong/missing?\n" +
          "Parsed deposit total: " +
          parsedDepositTotal +
          "\nParsed withdrawals total: " +
          parsedWithdrawalTotal +
          "\nActual deposit total: " +
          totalDeposits +
          "\nActual withdrawal total: " +
          totalWithdrawals,
      );
      throw new Error("Unable to parse successfully");
    }
  } else {
    throw new Error("Unsupported file type, expected PDF");
  }

  return transactions;
}

export async function chaseCreditParse(
  file: Blob,
): Promise<ParsedTransaction[]> {
  const transactions = [];

  if (file.type.includes("application/pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const extractedText = await extractPdfText(arrayBuffer);

    const yearText = extractedText.match(
      /Opening\/Closing Date (\d{2}\/\d{2}\/\d{2}) - (\d{2}\/\d{2}\/\d{2})/,
    );
    if (!yearText) throw new Error("Unable to parse file");
    const openingDate = yearText[1];
    const closingDate = yearText[2];
    const openingYear = openingDate.slice(-2);
    const closingYear = closingDate.slice(-2);
    const openingMonth = Number(openingDate.slice(0, 2));
    const crossesYearBoundary = openingYear !== closingYear;

    const totalPurchasesText = extractedText.match(
      /Purchases \+\$([\d,]+\.\d{2})/,
    );
    if (!totalPurchasesText) throw new Error("Unable to parse total purchases");
    const totalPurchases = Number(normalizeAmount(totalPurchasesText[1])) * -1;

    const sectionMatch = extractedText.match(
      /Transaction Merchant Name([\s\S]*?)Year-to-date/i,
    );
    const section = sectionMatch ? sectionMatch[1] : extractedText;

    const transactionRows =
      section.match(/^\d{2}\/\d{2}[\s\S]*?[\d,]+\.\d{2}$/gm) || [];

    for (const row of transactionRows) {
      const match = row.match(/(\d{2}\/\d{2}) ([\s\S]*?) ([\d,-]+\.\d{2})/i);
      if (match) {
        const transactionMonth = Number(match[1].slice(0, 2));
        const year =
          crossesYearBoundary && transactionMonth < openingMonth
            ? closingYear
            : openingYear;
        const date = `${match[1]}/${year}`;
        const description = match[2].trim().replace(/\s+/g, " ");
        const amount = String(Number(normalizeAmount(match[3])) * -1);
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
        throw new Error("Failed to parse a transaction row.");
      }
    }

    const parsedPaymentsTotal = sumMoney(
      transactions.filter((t) => Number(t.amount) < 0).map((t) => t.amount),
    );
    if (parsedPaymentsTotal !== totalPurchases) {
      console.warn(
        "Parsed transactions did not add up the total, maybe a transaction row was wrong/missing?\n" +
          "Parsed payments total: " +
          parsedPaymentsTotal +
          "\nActual payments total: " +
          totalPurchases,
      );
      throw new Error("Parsed payments total does not match expected total");
    }
  } else {
    throw new Error("Unsupported file type, expected PDF");
  }

  return transactions;
}

const rules: Partial<
  Record<
    DefaultFinancialInstitution,
    Partial<Record<StatementAccountType, StatementParser | null>>
  >
> = {
  "American Express": {
    credit: americanExpressCreditParse,
  },
  Discover: {
    credit: discoverCreditParse,
    checking: discoverCheckingParse,
  },
  Chase: {
    credit: chaseCreditParse,
  },
};

export function getRule(
  source?: string,
  type?: string,
): StatementParser | null {
  if (
    !source ||
    !type ||
    !isDefaultFinancialInstitution(source) ||
    !isStatementAccountType(type)
  ) {
    return null;
  }

  return rules[source]?.[type] ?? null;
}
