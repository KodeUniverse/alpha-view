use std::collections::HashMap;
use reqwest::blocking::get;
use scraper::{Html, Selector};
use serde::{Serialize, Deserialize};
use serde_json::to_string_pretty;

#[derive(Serialize, Deserialize)]
pub struct Article {
    pub headline: String,
    pub url: String,
    pub date: String,
}

fn save_to_json(articles: &Vec<Article>, filename: &str) -> Result<(), Box<dyn std::error::Error>> {
    let json_string = to_string_pretty(articles)?; 
    std::fs::write(filename, json_string)?;
    Ok(())
}

pub fn scrape_news(source: &str) -> Result<String, Box<dyn std::error::Error>> {
    let news_sources = HashMap::from([
        ("finviz", "https://www.finviz.com/news.ashx"),
        ("reuters", "https://www.reuters.com/world/"),
        ("bloomberg", "https://www.bloomberg.com/markets"),
    ]);
    
    if source.is_empty() {
        return Err("Source cannot be empty".into());
    }

    let url = news_sources
        .get(source)
        .ok_or("Unknown news source")?;

    let html_content = get(*url)?.text()?; // GET HTTP request, to fetch the HTML content

    if html_content.is_empty() {
        return Err("No content found".into());
    }

    if source == "finviz" {
        let document = Html::parse_document(&html_content);

        let news_block_selector = Selector::parse("tr.news_table-row").unwrap();
        let headline_selector = Selector::parse("a.nn-tab-link").unwrap();
        let url_selector = Selector::parse("a.nn-tab-link").unwrap();
        let date_selector = Selector::parse("td.news_date-cell").unwrap();

        let articles: Vec<Article> = document.select(&news_block_selector)
            .filter_map(|news_block| {
                let headline = news_block.select(&headline_selector).next()?.text().next()?.to_string();
                let url = news_block.select(&url_selector).next()?.value().attr("href")?.to_string();
                let date = news_block.select(&date_selector).next()?.text().next()?.to_string();
                Some(Article { headline, url, date })
            })
            .collect();
        std::fs::create_dir_all("data")?; // create data directory if it doesn't exist
        save_to_json(&articles, "data/finviz_news.json")?;
        Ok("Finviz news scraped and saved to data/finviz_news.json".into())
    } else {
        return Err("Scraping for this source is not implemented yet".into());
    }

}

