import { Request, Response } from "express";
import { all, get, run } from "../../database/db.js";

interface WatchlistRow {
  Id: number;
  Ticker: string;
  Name: string | null;
}

export async function getWatchlistController(_req: Request, res: Response) {
  try {
    const rows = await all<WatchlistRow>(
      `SELECT Id, Ticker, Name FROM WatchList ORDER BY Id`,
    );
    res.json(
      rows.map((row) => ({
        symbol: row.Ticker,
        name: row.Name ?? undefined,
      })),
    );
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ error: "Failed to fetch watchlist." });
  }
}

export async function addToWatchlistController(
  req: Request,
  res: Response,
) {
  try {
    const symbol = (req.body?.symbol as string | undefined)?.trim().toUpperCase();
    const name = (req.body?.name as string | undefined)?.trim();

    if (!symbol) {
      res.status(400).json({ error: "Missing required field: symbol." });
      return;
    }

    const existing = await get<WatchlistRow>(
      `SELECT Id, Ticker, Name FROM WatchList WHERE Ticker = ?`,
      [symbol],
    );
    if (existing) {
      res.status(200).json({ symbol, name: existing.Name ?? undefined });
      return;
    }

    const result = await run(
      `INSERT INTO WatchList (Ticker, Name) VALUES (?, ?)`,
      [symbol, name ?? null],
    );
    res.status(201).json({
      symbol,
      name,
      id: result.lastID,
    });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    res.status(500).json({ error: "Failed to add to watchlist." });
  }
}

export async function removeFromWatchlistController(
  req: Request,
  res: Response,
) {
  try {
    const symbol = req.params.symbol as string;

    if (!symbol) {
      res.status(400).json({ error: "Missing required param: symbol." });
      return;
    }

    const result = await run(`DELETE FROM WatchList WHERE Ticker = ?`, [
      symbol.toUpperCase(),
    ]);
    res.status(200).json({ deleted: result.changes > 0 });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    res.status(500).json({ error: "Failed to remove from watchlist." });
  }
}
