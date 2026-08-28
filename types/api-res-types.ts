// Transactions
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

export type transactions_get = {
  transactions: [
    {
      id: number;
      financial_account_id: number;
      date: string;
      description: string;
      amount: number;
      category_id: number;
    },
  ];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type financial_account_get = {
  id: number;
  name: string;
  type: string;
  institution: string | null;
  description: string | null;
};
