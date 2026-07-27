import { Request, Response } from "express";
import { getMarketNews } from "../../providers/index.js";

export async function newsController(req: Request, res: Response) {
  try {
    const category = (req.query.category as string) || "general";
    const news = await getMarketNews(category as any);
    res.json(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch market news." });
  }
}
