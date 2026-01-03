import cron from "node-cron";
import FTScraper from "./FTScraper.js";
import { Messenger } from "@alpha-view/utils";

async function main() {
  const ftMessenger = new Messenger();
  ftMessenger.connect();
  const ftScraper = new FTScraper();

  const runFTScraper = async () => {
    try {
      console.log("Starting Financial Times scrape...");
      const { data, timestamp } = await ftScraper.scrapeArticles();
      console.log(`ARTICLES SCRAPED: ${data}`, `TIMESTAMP: ${timestamp}`);

      await ftScraper.saveToDB(data, timestamp);
      ftMessenger.send("ft-news", "New FT articles ready!");
    } catch (error) {
      console.log(`Financial Times scrape failed: ${error}`);
    }
  };

  /* Initial run on startup */
  await runFTScraper();

  /* Scheduled runs */
  cron.schedule("*/15 * * * *", runFTScraper);
}

main().catch(console.error);
