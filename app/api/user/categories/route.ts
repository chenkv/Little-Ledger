import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "../utils";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await req.json();
    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Request body must be an array of categories" },
        { status: 400 },
      );
    }

    if (categories.length === 0) {
      return NextResponse.json(
        { error: "Category list cannot be empty" },
        { status: 400 },
      );
    }

    const insertStmt = db.query(
      "INSERT INTO categories (user_id, name, match_rules) VALUES (?, ?, ?)",
    );

    db.run("BEGIN");
    const inserted = [];

    for (const category of categories) {
      if (!category || typeof category !== "object") {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "Each category must be an object" },
          { status: 400 },
        );
      }

      const name =
        typeof category.name === "string" ? category.name.trim() : "";
      const matchRules =
        typeof category.match_rules === "string"
          ? category.match_rules.trim()
          : "";

      if (!name) {
        db.run("ROLLBACK");
        return NextResponse.json(
          { error: "name is required for each category" },
          { status: 400 },
        );
      }

      const result = insertStmt.run(userId, name, matchRules);
      inserted.push({
        id: result.lastInsertRowid,
        name,
        match_rules: matchRules,
      });
    }

    db.run("COMMIT");
    return NextResponse.json({ inserted }, { status: 201 });
  } catch (error) {
    console.error("Category insertion error:", error);
    try {
      db.run("ROLLBACK");
    } catch (rollbackError) {
      console.warn("Rollback failed:", rollbackError);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    if (
      requestBody === null ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      return NextResponse.json(
        { error: "Request body must be a category object" },
        { status: 400 },
      );
    }

    const categoryData = requestBody as Record<string, unknown>;
    const categoryId = categoryData.id;

    if (
      typeof categoryId !== "number" ||
      !Number.isSafeInteger(categoryId) ||
      categoryId <= 0
    ) {
      return NextResponse.json(
        { error: "Category id must be a positive integer" },
        { status: 400 },
      );
    }

    const update: { name?: string; match_rules?: string } = {};
    for (const [field, value] of Object.entries(categoryData)) {
      if (field === "id") continue;
      if (field !== "name" && field !== "match_rules") {
        return NextResponse.json(
          { error: `Unsupported category field: ${field}` },
          { status: 400 },
        );
      }

      if (typeof value !== "string") {
        return NextResponse.json(
          {
            error: `${field === "name" ? "Category name" : "Category match rules"} must be a string`,
          },
          { status: 400 },
        );
      }

      if (field === "name") {
        if (!value.trim()) {
          return NextResponse.json(
            { error: "Category name must be a non-empty string" },
            { status: 400 },
          );
        }
        update.name = value.trim();
      } else {
        update.match_rules = value.trim();
      }
    }

    const fields = Object.entries(update);
    if (fields.length === 0) {
      return NextResponse.json(
        { error: "At least one category field must be provided" },
        { status: 400 },
      );
    }

    const setClause = fields.map(([field]) => `${field} = ?`).join(", ");
    const result = db
      .query(`UPDATE categories SET ${setClause} WHERE id = ? AND user_id = ?`)
      .run(...fields.map(([, value]) => value), categoryId, userId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const category = db
      .query(
        "SELECT id, name, match_rules FROM categories WHERE id = ? AND user_id = ?",
      )
      .get(categoryId, userId);

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error("Category update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = db
      .query("SELECT id, name, match_rules FROM categories WHERE user_id = ?")
      .all(userId);

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Category retrieval error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestBody = await req.json();
    if (!Array.isArray(requestBody)) {
      return NextResponse.json(
        { error: "Request body must be an array of category IDs" },
        { status: 400 },
      );
    }

    const categoryIds = requestBody.filter(
      (id): id is number =>
        typeof id === "number" && Number.isSafeInteger(id) && id > 0,
    );

    if (categoryIds.length === 0) {
      return NextResponse.json(
        { error: "No valid category IDs provided" },
        { status: 400 },
      );
    }

    if (
      requestBody.some(
        (id) => typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0,
      )
    ) {
      return NextResponse.json(
        { error: "Each category ID must be a positive integer" },
        { status: 400 },
      );
    }

    const placeholders = categoryIds.map(() => "?").join(",");
    const result = db
      .query(
        `DELETE FROM categories WHERE id IN (${placeholders}) AND user_id = ?`,
      )
      .run(...categoryIds, userId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Categories not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Categories deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Category deletion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
