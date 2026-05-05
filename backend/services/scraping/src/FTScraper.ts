import * as cheerio from "cheerio";
import { alphaDB } from "@alpha-view/utils";
import { ScrapedArticle } from "./types/scrapeResult.js";

export default class FTScraper {
  public sourceURL: string;
  public sourceName: string;

  constructor() {
    this.sourceURL = "https://www.ft.com/markets?format=rss";
    this.sourceName = "Financial Times";
  }

  async fetchData(): Promise<string> {
    const res = await fetch(this.sourceURL);

    if (!res.ok)
      throw new Error(
        `Fetch failed for ${this.sourceName}, HTTP ${res.status}.`,
      );
    else return res.text();
  }

  async scrapeArticles(): Promise<{
    timestamp: string;
    data: ScrapedArticle[];
  } | null> {
    try {
      const rssFeed = await this.fetchData();

      const $ = cheerio.load(rssFeed, {
        xml: {
          xmlMode: true,
        },
      });

      const articles: Array<ScrapedArticle> = [];
      const articleItems = $("item");
      const lastBuildDate = new Date(
        $("channel > lastBuildDate").text(),
      ).toISOString();

      articleItems.each((index, item) => {
        const article = {
          title: $(item).find("title").text(),
          descr: $(item).find("description").text(),
          date: new Date($(item).find("pubDate").text()).toISOString(),
          url: $(item).find("link").text(),
        };
        articles.push(article);
      });

      if (articles.length === 0) {
        throw new Error("Scraped article data is empty.");
      }

      return { timestamp: lastBuildDate, data: articles };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async saveToDB(data: ScrapedArticle[], timestamp: string) {
    try {
      await alphaDB.query("BEGIN");
      for (const article of Object.values(data)) {
        await alphaDB.query(
          "INSERT INTO Article (Headline, Descr, URL, PubDate, NewsSource, LastUpdated)" +
            "VALUES ($1, $2, $3, $4, $5, $6)" +
            " ON CONFLICT (URL) DO UPDATE SET LastUpdated = ($6)",
          [
            article.title,
            article.descr,
            article.url,
            article.date,
            "Financial Times",
            timestamp,
          ],
        );
      }
      await alphaDB.query("COMMIT");
    } catch (error) {
      console.error(`Failed to save articles to alphaDB: ${error}`);
      await alphaDB.query("ROLLBACK");
    }
  }
}
