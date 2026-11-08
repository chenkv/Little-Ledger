import db from "@/lib/db";

type CategorizationParams = {
  userId: number;
  categoryId: number;
  rules: string;
};

export function categorizeTransactions({
  userId,
  categoryId,
  rules,
}: CategorizationParams) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user ID.");
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error("Invalid category ID.");
  }

  // Verify that this category belongs to the authenticated user.
  const category = db
    .prepare(
      `
    SELECT id
    FROM categories
    WHERE id = ?
      AND user_id = ?
  `,
    )
    .get(categoryId, userId);

  if (!category) {
    throw new Error("Category not found.");
  }

  const parsedRules = rules
    .split("\n")
    .map((line) =>
      line
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean),
    )
    .filter((rule) => rule.length > 0);

  if (parsedRules.length === 0) {
    throw new Error("At least one matching rule is required.");
  }

  // AND between terms in each rule.
  const ruleConditions = parsedRules.map(
    (rule) =>
      `(${rule
        .map(() => `instr(LOWER(t.description), LOWER(?)) > 0`)
        .join(" AND ")})`,
  );

  // OR between rules.
  const matchingCondition = ruleConditions.join(" OR ");

  const sql = `
    UPDATE transactions AS t
    SET category_id = ?
    WHERE t.financial_account_id IN (
      SELECT fa.id
      FROM financial_accounts AS fa
      WHERE fa.user_id = ?
    )
    AND (${matchingCondition});
  `;

  // Parameters must match the SQL placeholder order.
  const params = [categoryId, userId, ...parsedRules.flat()];

  try {
    const result = db.prepare(sql).run(...params);

    return result.changes;
  } catch (error) {
    console.error("Failed to categorize transactions:", error);
    throw new Error("Failed to update transactions.");
  }
}
