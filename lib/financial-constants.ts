export const defaultFinancialInstitutions = [
  "Chase",
  "Discover",
  "American Express",
] as const;

export type DefaultFinancialInstitution =
  (typeof defaultFinancialInstitutions)[number];

export const statementAccountTypes = ["checking", "credit"] as const;

export type StatementAccountType = (typeof statementAccountTypes)[number];
