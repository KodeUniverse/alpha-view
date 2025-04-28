package main

import (
	"fmt"

	"github.com/KodeUniverse/alpha-view/scraping" // Adjust the import path as necessary
)

func main() {
	// Call the ScrapeNews function from the scraping package
	scraping.ScrapeNews("finviz")

	// Print a message indicating that the scraping is complete
	fmt.Println("Scraping complete!")
}
