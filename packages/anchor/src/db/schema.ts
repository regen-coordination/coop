import type Database from "better-sqlite3";

const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS coops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      share_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      coop_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'member', 'observer')),
      joined_at TEXT NOT NULL,
      FOREIGN KEY (coop_id) REFERENCES coops(id) ON DELETE CASCADE,
      UNIQUE (coop_id, display_name)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS feed_items (
      id TEXT PRIMARY KEY,
      coop_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (coop_id) REFERENCES coops(id) ON DELETE CASCADE
    )
  `,
  "CREATE INDEX IF NOT EXISTS idx_members_coop_id ON members(coop_id)",
  "CREATE INDEX IF NOT EXISTS idx_feed_items_coop_id_created_at ON feed_items(coop_id, created_at DESC)",
];

export function initializeSchema(db: Database.Database): void {
  db.pragma("foreign_keys = ON");

  for (const statement of SCHEMA_STATEMENTS) {
    db.prepare(statement).run();
  }
}
