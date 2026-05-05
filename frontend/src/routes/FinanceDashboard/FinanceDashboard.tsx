import Navbar from "@components/Navbar/Navbar.tsx";
import SearchBar from "@components/SearchBar/SearchBar.tsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import MetricsCard from "./BottomBarMetrics.tsx";
import WatchlistCard from "./WatchlistPanel.jsx";
import { useState } from "react";
import { Box } from "@mui/material";
import { Ticker } from "@shared/types";

function FinanceDashboard() {
  const [ticker, setTicker] = useState<Ticker>({ symbol: "AAPL" });

  function handleTickerInput(newTicker: Ticker | null) {
    setTicker(newTicker ?? { symbol: "" });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Navbar>
        <SearchBar
          value={ticker}
          onTickerSelect={handleTickerInput}
          sxProps={{ marginLeft: 2 }}
        />
      </Navbar>
      <Box sx={{ display: "flex", flexDirection: "row", height: "100%" }}>
        <NewsFeed length={30} cardStyles={{ width: "35%", height: "100%" }} />
        <ChartArea
          ticker={ticker}
          cardStyles={{ width: "100%", height: "100%", paddingBottom: 7 }}
        />
        <WatchlistCard cardStyles={{ width: "35%", height: "100%" }} />
      </Box>
    </Box>
  );
}

export default FinanceDashboard;
