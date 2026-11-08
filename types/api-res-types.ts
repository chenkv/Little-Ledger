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
  category_id: number | null;
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
      category_id: number | null;
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

export type categories_get = {
  categories: [
    {
      id: number;
      name: string;
      match_rules: string;
    },
  ];
};

export type categories_insights = {
  latest_transactions_to_categorize: [
    {
      description: string;
      financial_account_id: Number;
      financial_account_name: string;
      transaction_date: string;
      transaction_id: Number;
    },
  ];
  recommended_transactions_to_categorize: [
    {
      description: string;
      financial_account_id: Number;
      financial_account_name: string;
      occurrence_count: Number;
      transaction_id: Number;
    },
  ];
};
