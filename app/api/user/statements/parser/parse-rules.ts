export type StatementSourceRule = {
  id: string;
  label: string;
  sectionPattern: RegExp;
  transactionRowsPattern: RegExp;
  transactionRowPattern: RegExp;
  normalizeDescription?: (value: string) => string;
};

export const americanExpressRule: StatementSourceRule = {
  id: "american-express",
  label: "American Express",
  sectionPattern: /New Charges[\s]*?Summary([\s\S]*?)Fees/i,
  transactionRowsPattern: /\d{2}\/\d{2}\/\d{2}[\s\S]*?\$[\d,]+\.\d{2}/g,
  transactionRowPattern: /(\d{2}\/\d{2}\/\d{2})[\s]*?([\s\S]*?)\$([\d,]+\.\d{2})/i,
  normalizeDescription: (value: string) => value.trim().replace(/\s+/g, " "),
};

export const discoverRule: StatementSourceRule = {
  id: "discover",
  label: "Discover",
  sectionPattern: /Transactions([\s\S]*?)Statement Balance is the total/i,
  transactionRowsPattern: /\d{2}\/\d{2}\/\d{2}(?:(?!^\d{2}\/\d{2}\/\d{2})[\s\S])*?\$ [\d,]+\.\d{2}/gm,
  transactionRowPattern: /(\d{2}\/\d{2}\/\d{2})[\s]+(?:\d{2}\/\d{2}\/\d{2})([\s\S]*?)\$[\s]+([\d,]+.\d{2})/i,
  normalizeDescription: (value: string) => value.trim().replace(/\s+/g, " "),
};

const rules: Record<string, StatementSourceRule> = {
  "american-express": americanExpressRule,
  "discover": discoverRule,
};

export function getRule(source?: string): StatementSourceRule {
  if (!source) {
    return americanExpressRule;
  }

  const key = source.toLowerCase();
  return rules[key] ?? americanExpressRule;
}
