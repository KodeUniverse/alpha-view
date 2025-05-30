package scraping

import (
	"io"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/things-go/go-socks5"
)

func StartProxy(network, addr string) error {
	// Create a new SOCKS5 proxy server
	proxyServer := socks5.NewServer(socks5.WithLogger(socks5.NewLogger(log.New(os.Stdout, "socks5: ", log.LstdFlags))))

	return proxyServer.ListenAndServe(network, addr)
}

func StartHTTPProxy(addr string) error {
	// Create a handler for the HTTP proxy
	proxyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Establish a connection to the target server
		destConn, err := net.Dial("tcp", r.Host)
		if err != nil {
			http.Error(w, "Unable to connect to destination", http.StatusBadGateway)
			return
		}
		defer destConn.Close()

		// Respond to the client indicating the connection is established
		w.WriteHeader(http.StatusOK)
		hijacker, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
			return
		}
		clientConn, _, err := hijacker.Hijack()
		if err != nil {
			http.Error(w, "Hijacking failed", http.StatusInternalServerError)
			return
		}
		defer clientConn.Close()

		// Relay data between client and destination
		go io.Copy(destConn, clientConn)
		io.Copy(clientConn, destConn)
	})

	// Start the HTTP proxy server
	server := &http.Server{Addr: addr, Handler: proxyHandler}
	return server.ListenAndServe()
}
