package scraping

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/gocolly/colly"
)

type Article struct {
	Headline string
	URL      string
	Date     string
}

func ScrapeMarketData() error {
	return nil
}

// ScrapeNews scrapes news articles from the specified source
// and prints the headlines and links to the console.
// source is a string representing the news source to scrape.
// source can be "bloomberg" or "reuters". (BLOOMBERG FUNCTIONALITY IS WIP)
func ScrapeNews(source string) error {

	// Define the URLs to scrape
	URLs := map[string]string{
		"bloomberg": "https://www.bloomberg.com/markets",
		"finviz":    "https://finviz.com/news.ashx",
		"reuters":   "https://www.reuters.com/world/",
	}

	// Create a new collector
	c := colly.NewCollector(colly.AllowURLRevisit())

	// Callbacks for request, response, and error handling
	c.OnRequest(func(r *colly.Request) {
		fmt.Println("Starting scrape of", r.URL)
	})

	c.OnResponse(func(r *colly.Response) {
		fmt.Println("Visited", r.Request.URL)
	})

	c.OnError(func(r *colly.Response, err error) {
		fmt.Println("Error:", err)
	})

	switch source {
	case "bloomberg":
		// Set up a callback for when an <a> element with an href attribute is found
		c.OnHTML("a[href]", func(e *colly.HTMLElement) {
			link := e.Attr("href")
			spanText := e.ChildText("span")
			fmt.Printf("Found link: %s, Underlying span: %s\n", link, spanText)
		})
	case "finviz":
		var articles []Article

		c.OnHTML("table.styled-table-new > tbody > tr.news_table-row", func(e *colly.HTMLElement) {
			headline := e.ChildText("td.news_link-cell > a.nn-tab-link")
			url := e.ChildAttr("td.news_link-cell > a.nn-tab-link", "href")
			date := e.ChildText("td.news_date-cell")

			if headline != "" && url != "" && date != "" {
				articles = append(articles, Article{
					Headline: headline,
					URL:      url,
					Date:     date,
				})
			}
		})

		// Scrape Finviz
		c.Visit(URLs[source])
		content, err := json.Marshal(articles)
		if err != nil {
			fmt.Println(err.Error())
			return err
		}
		// Write scrape to JSON
		if err := os.WriteFile("scraping/data/finviz.json", content, 0644); err != nil {
			fmt.Println("Error writing file: ", err)
			return err
		}
		fmt.Println("Articles saved!")
	}
	return nil
}
