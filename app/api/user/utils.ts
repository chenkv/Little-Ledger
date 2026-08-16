import { PDFParse } from "pdf-parse";
import path from "path";
import db from "@/lib/db";

export async function getUserIdFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const session = db
    .query("SELECT user_id, expires_at FROM sessions WHERE session_token = ?")
    .get(token);

  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) return null;

  return session.user_id as number;
}

export async function extractPdfText(arrayBuffer: ArrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  // Ensure pdf.js won't attempt to load a relative worker from the
  // compiled chunk. Point it at the shipped worker file first.
  try {
    const workerPath = path.resolve(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    );
    PDFParse.setWorker(`file://${workerPath}`);
  } catch (err) {
    console.warn("PDF worker path setup failed:", err);
  }

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text || "";
}
