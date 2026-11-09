import db from "@/lib/db";

export async function getCommonUncategorizedTransactions(userId: number) {
  const transactions = db
    .query(
      `
      SELECT
        t.description,
        fa.name AS financial_account_name,
        fa.id AS financial_account_id,
        COUNT(*) AS occurrence_count
      FROM transactions AS t
      JOIN financial_accounts AS fa ON fa.id = t.financial_account_id
      WHERE t.category_id IS NULL AND fa.user_id = ?
      GROUP BY t.description, fa.id
      HAVING COUNT(*) > 1
      ORDER BY occurrence_count DESC;
    `,
    )
    .all(userId);
  return transactions;
}

export async function getLastUncategorizedTransactions(userId: number) {
  const transactions = db
    .query(
      `
      SELECT
        t.description,
        t.id AS transaction_id,
        t.date AS transaction_date,
        t.amount as transaction_amount,
        fa.name AS financial_account_name,
        fa.id AS financial_account_id
      FROM transactions AS t
      JOIN financial_accounts AS fa ON fa.id = t.financial_account_id
      WHERE t.category_id IS NULL AND fa.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100;
    `,
    )
    .all(userId);
  return transactions;
}
