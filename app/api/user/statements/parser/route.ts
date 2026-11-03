import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "../../utils";
import { getRule } from "@/lib/parse-rules";

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Use multipart/form-data" },
      { status: 415 },
    );
  }

  const formData = await req.formData();

  const file = formData.get("file");
  const meta = formData.get("meta");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const isPdf = file.type.includes("application/pdf");
  const isCsv = file.type.includes("text/csv");
  if (!isPdf && !isCsv) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF or CSV file." },
      { status: 415 },
    );
  }

  const extra = meta ? JSON.parse(meta.toString()) : {};
  const source = typeof extra.source === "string" ? extra.source : undefined;
  const source_type = typeof extra.type === "string" ? extra.type : undefined;
  const rule = getRule(source, source_type);

  if (!rule) {
    return NextResponse.json(
      { error: "No parsing rule found for the provided source" },
      { status: 400 },
    );
  }

  let transactions = [];
  try {
    transactions = await rule(file);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse statement",
      },
      { status: 400 },
    );
  }

  if (transactions.length === 0) {
    return NextResponse.json(
      {
        message:
          "Unable to parse any transactions. Please check your input parameters.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { message: "Parsed transactions successfully", transactions },
    { status: 200 },
  );
}
