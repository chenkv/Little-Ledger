export type transaction_row = {
  id: number;
  financial_account_id: number;
  date: string;
  description: string;
  amount: number;
  category_id: number | null;
};

export type financial_account_get = {
  id: number;
  name: string;
  type: string;
  institution: string | null;
  description: string | null;
};
