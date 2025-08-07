mod article_scraper;

fn main() {
    let source = "finviz";
    println!("Scraping news from {}...", source);
    
    match article_scraper::scrape_news(source) {
        Ok(res) => println!("{}", res),
        Err(e) => println!("Error: {}", e),
    }
}