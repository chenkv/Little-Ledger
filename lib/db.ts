import { Database } from "bun:sqlite";

const db = new Database("ledger-data.db", { create: true });

db.run("PRAGMA foreign_keys = ON;");

// USERS
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// FINANCIAL ACCOUNTS (per user)
db.run(`
  CREATE TABLE IF NOT EXISTS financial_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT,
    description TEXT,
    type TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// TRANSACTIONS (belong to financial accounts)
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_account_id INTEGER NOT NULL,
    date TEXT,
    description TEXT,
    amount REAL,
    FOREIGN KEY(financial_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
  );
`);

function closeDB() {
  try {
    db.close();
    console.log("SQLite database closed.");
  } catch (err) {
    console.error("Error closing DB:", err);
  }
}

process.on("SIGINT", closeDB);
process.on("SIGTERM", closeDB);

export default db;
