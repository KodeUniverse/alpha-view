import { Request, Response } from "express";
import { getSymbolList } from "../../providers/index.js";

export async function symbolsController(_req: Request, res: Response) {
  try {
    const symbols = await getSymbolList();
    res.json(symbols);
  } catch (error) {
    console.error("Error fetching symbols:", error);
    res.status(500).json({ error: "Failed to fetch symbol list." });
  }
}
