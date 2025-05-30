package main

import (
	"fmt"

	"github.com/KodeUniverse/alpha-view/scraping"
)

func main() {

	res := scraping.StartHTTPProxy("95.179.227.47:3002")
	fmt.Println(res)
}
