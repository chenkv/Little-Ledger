import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create parser instance using v2 API
    const parser = new PDFParse({ data: buffer });

    // Extract text
    const result = await parser.getText();
    const text = result.text;

    // --- SIMPLE PARSER EXAMPLE ---
    // Adjust this to match your bank statement format
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const parsedRows: { date: string; description: string; amount: number }[] = [];

    for (const line of lines) {
      // Example format:
      // 2024-01-03 Starbucks -5.75
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2})\s+(.*?)\s+(-?\d+\.\d{2})$/
      );

      if (match) {
        const [, date, description, amount] = match;
        parsedRows.push({
          date,
          description,
          amount: parseFloat(amount)
        });
      }
    }

    // Insert into SQLite
    const insert = db.prepare(
      "INSERT INTO transactions (date, description, amount) VALUES (?1, ?2, ?3)"
    );

    db.transaction(() => {
      for (const row of parsedRows) {
        insert.run(row.date, row.description, row.amount);
      }
    })();

    return NextResponse.json(
      {
        message: "PDF processed successfully",
        rowsInserted: parsedRows.length
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to process PDF", details: err.message },
      { status: 500 }
    );
  }
}
