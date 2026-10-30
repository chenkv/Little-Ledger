import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "../utils";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const institutions = db
      .query("SELECT id, name FROM financial_institutions ORDER BY name")
      .all();

    return NextResponse.json({ institutions }, { status: 200 });
  } catch (error) {
    console.error("Financial institution retrieval error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
