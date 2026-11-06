import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/app/api/user/utils";
import {
  getCommonUncategorizedTransactions,
  getLastUncategorizedTransactions,
} from "@/app/lib/insights";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recommendedTransactionsToCategorize =
      await getCommonUncategorizedTransactions(userId);
    const latestTransactionsToCategorize =
      await getLastUncategorizedTransactions(userId);

    return NextResponse.json({
      recommended_transactions_to_categorize:
        recommendedTransactionsToCategorize,
      latest_transactions_to_categorize: latestTransactionsToCategorize,
    });
  } catch (error) {
    console.error("Error fetching uncategorized transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
