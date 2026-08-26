export type transaction_row = {
  id: number;
  financial_account_id: number;
  date: string;
  description: string;
  amount: number;
  category_id: number | null;
};

export type parsed_transaction_row = {
  date: string;
  description: string;
  amount: number | string;
};
