import { Database } from "bun:sqlite";
import { defaultFinancialInstitutions } from "./financial-constants";

const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.BUN_TEST === "true";
const databasePath =
  process.env.LEDGER_DB_PATH ||
  (isTestEnv ? "TEST-ledger-data.db" : "ledger-data.db");
const db = new Database(databasePath, { create: true });

db.run("PRAGMA foreign_keys = ON;");

// USERS
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// LOGIN SESSIONS (per user)
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS financial_institutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
`);

const insertFinancialInstitution = db.prepare(`
  INSERT INTO financial_institutions (name)
  SELECT ? WHERE NOT EXISTS (
    SELECT 1 FROM financial_institutions WHERE name = ?
  );
`);

for (const name of defaultFinancialInstitutions) {
  insertFinancialInstitution.run(name, name);
}

// FINANCIAL ACCOUNTS (per user)
db.run(`
  CREATE TABLE IF NOT EXISTS financial_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    institution INTEGER NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(institution) REFERENCES financial_institutions(id)
  );
`);

// TRANSACTIONS (belong to financial accounts)
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_account_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    category_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(financial_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`);

// CATEGORIES (per user, for classifying transactions)
db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    match_rules TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function closeDB() {
  try {
    db.close(false);
    console.log("SQLite database closed.");
  } catch (err) {
    console.error("Error closing DB:", err);
  }
}

process.on("SIGINT", closeDB);
process.on("SIGTERM", closeDB);

export default db;
