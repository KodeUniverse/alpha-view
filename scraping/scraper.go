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

// ScrapeNews scrapes news articles from the specified source
// and prints the headlines and links to the console.
// source is a string representing the news source to scrape.
// source can be "bloomberg" or "reuters".
func ScrapeNews(source string) {

	// Define the URLs to scrape
	URLs := map[string]string{
		"bloomberg": "https://www.bloomberg.com/markets",
		"finviz":    "https://finviz.com/news.ashx",
		"reuters":   "https://www.reuters.com/world/",
	}

	// Create a new collector
	c := colly.NewCollector(colly.AllowURLRevisit())

	// Set up a proxy
	//proxyURL := []string{"127.0.0.1:1337", "socks5://127.0.0.1:1338"}

	//http_res := StartHTTPProxy(proxyURL[0]) //StartProxy("tcp", proxyURL[0])
	// if err != nil {
	// 	fmt.Println("Error starting proxy:", err)
	// 	return
	// }
	//fmt.Println("HTTP Result:", http_res)
	//fmt.Println("Proxy started at", proxyURL[0])
	//c.SetProxy(proxyURL[0])
	//fmt.Println("Proxy set!")
	// proxyHandler, err := proxy.RoundRobinProxySwitcher(proxyURL[0], proxyURL[1])
	// if err != nil {
	// 	fmt.Println("Error setting up proxy:", err)
	// 	return
	// }
	// c.SetProxyFunc(proxyHandler)

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
		}
		// Write scrape to JSON
		if err := os.WriteFile("scraping/data/finviz.json", content, 0644); err != nil {
			fmt.Println("Error writing file: ", err)
		}
		fmt.Println("Articles saved!")
	}
}

// Set up a callback for when a visited HTML element is found
// c.OnHTML("article.story", func(e *colly.HTMLElement) {
// 	headline := e.ChildText("h3.story-title")
// 	link := e.ChildAttr("a", "href")

// 	if headline != "" && link != "" {
// 		fmt.Printf("Headline: %s\nLink: %s\n", headline, link)
// 		//saveToXML(headline, link)
// 	}
// })

// Start the scraping process
