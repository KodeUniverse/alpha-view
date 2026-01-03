import axios from "axios";
import * as cheerio from "cheerio";

import cron from "node-cron";
import { alphaDB } from "@alpha-view/utils";
import { Messenger } from "@alpha-view/utils";

async function scrapeNews() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };

  const url = "https://finviz.com/news.ashx";

  const htmlContent = await axios.get(url, { headers });
  const $ = cheerio.load(htmlContent.data);

  const articles = [];

  const newsAndBlog = $("table.news_time-table > tbody").find("tr")[1];
  const newsBlock = $(newsAndBlog).find("td")[0];
  $(newsBlock)
    .find("table.styled-table-new > tbody > tr.news_table-row")
    .each((i, elem) => {
      const headline = $(elem).find("td.news_link-cell > a.nn-tab-link").text();
      const link = $(elem)
        .find("td.news_link-cell > a.nn-tab-link")
        .attr("href");
      const _date = $(elem).find("td.news_date-cell").text();

      let article = {
        title: headline,
        URL: link,
        date: _date,
      };

      articles.push(article);
    });
  return articles;
}

async function saveToDB(articles) {
  try {
    const timestamp = new Date(Date.now()).toISOString();

    let insertCount = 0;
    await alphaDB.query("BEGIN"); // start transaction
    for (const article of articles) {
      // save article if doesn't exist

      if (
        !article ||
        !article.title?.trim() ||
        !article.URL?.trim() ||
        !article.date?.trim()
      ) {
        console.log(`Skipping empty/invalid article: ${article}`);
        continue;
      }

      const existingArticle = await alphaDB.query(
        "SELECT ArticleId FROM Article WHERE URL = $1",
        [article.URL],
      );

      if (existingArticle.rows.length === 0) {
        console.log("No duplicate article, adding new record.");
        await alphaDB.query(
          "INSERT INTO Article (Headline, URL, Date, Source, Timestamp, LastUpdated) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            article.title,
            article.URL,
            article.date,
            "Finviz",
            timestamp,
            timestamp,
          ],
        );
      } else {
        console.log(
          `Duplicate article detected, updating existing record, articleid=${existingArticle.rows[0].articleid}`,
        );
        await alphaDB.query(
          "UPDATE Article SET Headline = $1, URL = $2, Date = $3, Source = $4, LastUpdated = $6 WHERE ArticleId = $5",
          [
            article.title,
            article.URL,
            article.date,
            "Finviz",
            existingArticle.rows[0].articleid,
            timestamp,
          ],
        );
      }
      insertCount++;
    }
    await alphaDB.query("COMMIT");
    console.log(`Saved ${insertCount} articles into AlphaDB!`);
  } catch (error) {
    await alphaDB.query("ROLLBACK");
    console.error(error);
  }
}

async function main() {
  const messenger = new Messenger();
  messenger.connect();

  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("Starting Finviz scrape...");
      const data = await scrapeNews();
      console.log("Finviz scrape succeeded, saving to AlphaDB...");
      await saveToDB(data);
      messenger.send("finviz-data-update", `Updated finviz news data!`);
    } catch (error) {
      console.error(`Finviz scrape failed: ${error.stack}`);
    }
  });
}

main().catch(console.error);
