import { all, run } from "./db.js";

export const initDatabaseSchema = async () => {
  await run(
    `CREATE TABLE IF NOT EXISTS WatchList (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Ticker TEXT,
    Name TEXT
)`,
  );

  // Migration: ensure WatchList has the Name column for older databases.
  const columns = await all<{ name: string }>(`PRAGMA table_info(WatchList)`);
  if (!columns.some((col) => col.name === "Name")) {
    await run(`ALTER TABLE WatchList ADD COLUMN Name TEXT`);
  }
};
