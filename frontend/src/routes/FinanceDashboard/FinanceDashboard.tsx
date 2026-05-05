import Navbar from "@components/Navbar/Navbar.tsx";
import SearchBar from "@components/SearchBar/SearchBar.tsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import MetricsCard from "./BottomBarMetrics.tsx";
import WatchlistCard from "./WatchlistPanel.jsx";
import { useState } from "react";
import { Box } from "@mui/material";

function FinanceDashboard() {
  const [stockSymbol, setStockSymbol] = useState("AAPL");

  function handleTickerInput(symbol: string) {
    setStockSymbol(symbol);
    console.log(`Stock symbol changed at app level: ${symbol}`);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Navbar>
        <SearchBar
          value={stockSymbol}
          onTickerSelect={handleTickerInput}
          sxProps={{ marginLeft: 2 }}
        />
      </Navbar>
      <Box sx={{ display: "flex", flexDirection: "row", height: "100%" }}>
        <NewsFeed length={30} cardStyles={{ width: "35%", height: "100%" }} />
        <ChartArea
          symbol={stockSymbol}
          cardStyles={{ width: "100%", height: "100%", paddingBottom: 7 }}
        />
        <WatchlistCard cardStyles={{ width: "35%", height: "100%" }} />
      </Box>
    </Box>
  );
}

export default FinanceDashboard;
