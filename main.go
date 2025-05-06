package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/KodeUniverse/alpha-view/scraping" // Adjust the import path as necessary
)

func NewsRefreshProcess(exit chan bool) error {
	for range time.Tick(5 * time.Second) {
		select {
		case <-exit:
			fmt.Println("Exiting News Refresh Process")
			return nil
		default:
			if err := scraping.ScrapeNews("finviz"); err != nil {
				fmt.Println("Error scraping news:", err)
				return err
			}
			// Print a message indicating that the scraping is complete
			fmt.Println("Scraping complete!")
		}
	}
	return nil
}

func main() {

	// Define server configuration
	port_name := "8080"
	server := &http.Server{
		Addr: ":" + port_name}

	// Set up a simple HTTP handler
	http.Handle("/", http.FileServer(http.Dir(".")))

	// Start the News Refresh Process
	news_exit := make(chan bool)
	go NewsRefreshProcess(news_exit)

	// Set up a channel to listen for SIGTERM/Ctrl+C signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM, os.Interrupt)

	// Start the Web Server
	go func() {
		if err := server.ListenAndServe(); err != nil {
			log.Println("Error starting server:", err)
		}
		log.Println("Running AlphaView server on port ", port_name, "... Press Ctrl+C to kill.")
	}()

	<-sigChan // Wait for a signal
	log.Println("Received interrupt signal, shutting down AlphaView server...")

	// Exit all other goroutines
	news_exit <- true

	// Gracefully shut down the server
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Println("Error shutting down server:", err)
	} else {
		log.Println("Server shut down gracefully.")
	}
}
