import sqlite3 from "sqlite3";

const database = new sqlite3.Database("alphadb.sqlite");

export function run(
  sql: string,
  params: unknown[] = [],
): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function get<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}
