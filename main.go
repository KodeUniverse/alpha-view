package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/KodeUniverse/alpha-view/scraping" // Adjust the import path as necessary
)

func NewsRefresh() error {
	for range time.Tick(1 * time.Second) {
		if err := scraping.ScrapeNews("finviz"); err != nil {
			fmt.Println("Error scraping news:", err)
			return err
		}
		// Print a message indicating that the scraping is complete
		fmt.Println("Scraping complete!")

	}
	return nil
}

func main() {

	// Start the Web Server
	server := http.FileServer(http.Dir("."))
	go http.ListenAndServe(":8080", server)

	// Refresh News Feed every second
	//go NewsRefresh()
}
