// Notes:
// - Currently ignoring any negative amounts in the statements, as they are usually refunds or credits. This may need to be revisited in the future.

export type StatementSourceRule = {
  id: string;
  label: string;
  // Regex to narrow down to relevant section, requires one capture group
  sectionPattern: RegExp;
  // Regex to capture each transaction row
  transactionRowsPattern: RegExp;
  // Regex to capture date, description, and amount from each row, requires three capture groups
  transactionRowPattern: RegExp;
  // Regex to capture date, description, and amount from each CSV row, requires three capture groups
  csvRowPattern?: RegExp;
  // Whether to skip the first CSV row as a header line
  skipCsvHeader?: boolean;
  normalizeDescription?: (value: string) => string;
};

export const americanExpressRule: StatementSourceRule = {
  id: "american-express",
  label: "American Express",
  sectionPattern: /New Charges[\s]*?Summary([\s\S]*?)Fees/i,
  transactionRowsPattern: /\d{2}\/\d{2}\/\d{2}[\s\S]*?\$[\d,]+\.\d{2}/g,
  transactionRowPattern: /(\d{2}\/\d{2}\/\d{2})[\s]*?([\s\S]*?)\$([\d,]+\.\d{2})/i,
  csvRowPattern: /(\d{2}\/\d{2}\/\d{4}),([\s\S]*?),([-\d,]+\.\d{2})/i,
  skipCsvHeader: true,
  normalizeDescription: (value: string) => value.trim().replace(/\s+/g, " "),
};

export const discoverRule: StatementSourceRule = {
  id: "discover",
  label: "Discover",
  sectionPattern: /Transactions([\s\S]*?)Statement Balance is the total/i,
  transactionRowsPattern: /\d{2}\/\d{2}\/\d{2}(?:(?!^\d{2}\/\d{2}\/\d{2})[\s\S])*?\$ [\d,]+\.\d{2}/gm,
  transactionRowPattern: /(\d{2}\/\d{2}\/\d{2})[\s]+(?:\d{2}\/\d{2}\/\d{2})([\s\S]*?)\$[\s]+([\d,]+.\d{2})/i,
  csvRowPattern: /(\d{2}\/\d{2}\/\d{4}),(?:\d{2}\/\d{2}\/\d{4}),"([\s\S]*?)",([-\d,]+\.\d{2}),"([\s\S]*?)"/i,
  skipCsvHeader: true,
  normalizeDescription: (value: string) => value.trim().replace(/\s+/g, " "),
};

export const chaseRule: StatementSourceRule = {
  id: "chase",
  label: "Chase",
  sectionPattern: /Transaction Merchant Name([\s\S]*?)Year-to-date/i,
  transactionRowsPattern: /^\d{2}\/\d{2}[^\n]*?[\s][\d,]+\.\d{2}$/gm,
  transactionRowPattern: /(\d{2}\/\d{2})[\s]+([\s\S]*?)[\s]+([\d,]+\.\d{2})/i,
  normalizeDescription: (value: string) => value.trim().replace(/\s+/g, " "),
};

const rules: Record<string, StatementSourceRule> = {
  "american-express": americanExpressRule,
  "discover": discoverRule,
  "chase": chaseRule,
};

export function getRule(source?: string): StatementSourceRule | null {
  if (!source) {
    return null;
  }

  const key = source.toLowerCase();
  return rules[key];
}
