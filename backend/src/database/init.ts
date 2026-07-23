import sqlite3 from "sqlite3";

export const initDatabaseSchema = () => {
  const database = new sqlite3.Database("alphadb.sqlite");

  // Define Schema

  database.exec(`
    CREATE TABLE IF NOT EXISTS WatchList (
    Id INTEGER PRIMARY KEY,
    Ticker TEXT
)
`);
};
