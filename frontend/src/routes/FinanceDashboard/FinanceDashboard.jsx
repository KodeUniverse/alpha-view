import Navbar from "@components/Navbar/Navbar.jsx";
import SearchBar from "@components/SearchBar/SearchBar.jsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import MetricsCard from "./BottomBarMetrics.jsx";
import WatchlistCard from "./WatchlistPanel.jsx";
import styles from "./FinanceDashboard.module.css";
import { useState } from "react";

function FinanceDashboard() {
  const [stockSymbol, setStockSymbol] = useState("AAPL");

  function handleTickerInput(symbol) {
    setStockSymbol(symbol);
    console.log(`Stock symbol changed at app level: ${symbol}`);
  }

  return (
    <div className={styles["pg"]}>
      <Navbar>
        <SearchBar
          value={stockSymbol}
          onTickerSelect={handleTickerInput}
          sxProps={{ marginLeft: 2 }}
        />
      </Navbar>
      <div className={styles["pg-content"]}>
        <NewsFeed length={30} cardStyles={{ width: "35%", height: "100%" }} />
        <ChartArea
          symbol={stockSymbol}
          cardStyles={{ width: "100%", height: "100%", paddingBottom: 7 }}
        />
        <WatchlistCard cardStyles={{ width: "35%", height: "100%" }} />
      </div>
    </div>
  );
}

export default FinanceDashboard;
