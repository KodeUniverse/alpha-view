package main

import (
	"fmt"

	"github.com/KodeUniverse/alpha-view/scraping" // Adjust the import path as necessary
)

func main() {
	// Call the ScrapeNews function from the scraping package
	if err := scraping.ScrapeNews("finviz"); err != nil {
		fmt.Println("Error scraping news:", err)
		return
	}

	// Print a message indicating that the scraping is complete
	fmt.Println("Scraping complete!")
}
