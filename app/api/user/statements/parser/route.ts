import { NextResponse } from "next/server";
import { getUserIdFromRequest, extractPdfText } from "../../utils";
import { getRule } from "./parse-rules";

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Use multipart/form-data" }, { status: 415 });
  }

  const formData = await req.formData();

  const file = formData.get("file");
  const meta = formData.get("meta");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const transactions = [];

  if (file.type.includes("application/pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const extra = meta ? JSON.parse(meta.toString()) : {};

    const source = typeof extra.source === "string" ? extra.source : undefined;
    const rule = getRule(source);

    // parse buffer, use extra metadata
    const extractedText = await extractPdfText(arrayBuffer);

    const sectionMatch = extractedText.match(rule.sectionPattern);
    const section = sectionMatch ? sectionMatch[1] : extractedText;

    const transactionRows = section.match(rule.transactionRowsPattern) || [];

    for (const row of transactionRows) {
      const match = row.match(rule.transactionRowPattern);
      if (match) {
        const date = match[1];
        const description = rule.normalizeDescription
          ? rule.normalizeDescription(match[2])
          : match[2].trim().replace(/\s+/g, " ");
        const amount = match[3];
        transactions.push({ date, description, amount });
      } else {
        console.warn("Failed to parse row:", row);
      }
    }
  } else if (file.type.includes("text/csv")) {
    transactions.push("Not implemented yet");
  }

  if (transactions.length === 0) {
    return NextResponse.json(
      { message: "Unable to parse any transactions. Please check your input parameters." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { message: "Parsed transactions successfully", transactions },
    { status: 200 }
  );
}
