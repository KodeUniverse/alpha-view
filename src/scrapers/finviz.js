import axios from "axios";
import * as cheerio from "cheerio";
import FileSystem from "fs";
import cron from "node-cron";
import redis from "redis";

async function scrapeNews(source) {

    sites = {
        "finviz": "https://finviz.com/news.ashx",
    };

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };

    const url = sites[source];

    const htmlContent = await axios.get(url, { headers });
    const cheerio_obj = cheerio.load(htmlContent.data);

    const articles = [];

    switch (source) {
        case "finviz":
            cheerio_obj("table.styled-table-new > tbody > tr.news_table-row").each((i, elem) => {
                const headline = cheerio_obj(elem).find("td.news_link-cell > a.nn-tab-link").text();
                const link = cheerio_obj(elem).find("td.news_link-cell > a.nn-tab-link").attr("href");
                const _date = cheerio_obj(elem).find("td.news_date-cell").text();

                let article = {
                    title: headline,
                    URL: link,
                    date: _date
                };

                articles.push(article);
            });
    }
    
}

async function main() {

    cron.schedule('*/1 * * * *', async () => {
        try {
            // start scrape
            const data = await scrapeNews();

        } catch (error) {
            console.error('Finviz scrape failed.');
        }
    });
}

main().catch(console.error)