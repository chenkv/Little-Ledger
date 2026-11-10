import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/app/api/user/utils";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(req.url).searchParams;
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month must be in YYYY-MM format" },
        { status: 400 },
      );
    }

    const transactions = db
      .query(
        `SELECT t.*, fa.name AS financial_account_name FROM transactions t
        JOIN financial_accounts fa ON t.financial_account_id = fa.id
        WHERE fa.user_id = ? AND STRFTIME('%Y-%m', date) = ?
        ORDER BY t.date DESC;`,
      )
      .all(userId, month) as { amount: number }[];

    const total_spent =
      transactions.reduce(
        (total, item) =>
          total + (item.amount < 0 ? Math.round(item.amount * 100) : 0),
        0,
      ) / 100;

    const income =
      transactions.reduce(
        (total, item) =>
          total + (item.amount > 0 ? Math.round(item.amount * 100) : 0),
        0,
      ) / 100;

    return NextResponse.json(
      { transactions, total_spent, income },
      { status: 200 },
    );
  } catch (error) {
    console.error("Transactions retrieval error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
