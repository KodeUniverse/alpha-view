import { Request, Response } from "express";
import { getBars } from "../../providers/index.js";
import { Ticker, Frequency } from "@shared/types";

export async function barsController(req: Request, res: Response) {
  try {
    const { symbols, freq, start, end } = req.query;

    if (!symbols || !freq || !start || !end) {
      res.status(400).json({ error: "Missing required query params: symbols, freq, start, end." });
      return;
    }

    const tickerList: Ticker[] = (symbols as string).split(",").map((s) => ({ symbol: s.trim() }));
    const frequency = freq as Frequency;
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    // Always respond with the { [symbol]: OHLCVData[] } shape, regardless of
    // how many symbols were requested, so clients don't need to special-case
    // the single-symbol response.
    const bars = await getBars(tickerList, frequency, startDate, endDate);
    res.json(bars);
  } catch (error) {
    console.error("Error fetching bars:", error);
    res.status(500).json({ error: "Failed to fetch bars." });
  }
}
