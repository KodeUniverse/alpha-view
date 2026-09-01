import { Request, Response } from "express";
import { getBasicFinancials } from "../../providers/index.js";

export async function financialsController(req: Request, res: Response) {
  try {
    const ticker = req.params.ticker as string;
    if (!ticker) {
      res.status(400).json({ error: "Missing ticker param." });
      return;
    }

    const financials = await getBasicFinancials({ symbol: ticker });
    res.json(financials);
  } catch (error) {
    console.error("Error fetching financials:", error);
    res.status(500).json({ error: "Failed to fetch financials." });
  }
}
