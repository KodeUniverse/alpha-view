import Navbar from "@components/Navbar/Navbar.tsx";
import SearchBar from "@components/SearchBar/SearchBar.tsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import MetricsCard from "./MetricsCard.tsx";
import WatchlistCard from "./WatchlistPanel.jsx";
import { useState } from "react";
import { Ticker } from "@shared/types";
import { Group, Stack } from "@mantine/core";

function FinanceDashboard() {
  const [ticker, setTicker] = useState<Ticker>({ symbol: "AAPL" });

  function handleTickerInput(newTicker: Ticker | null) {
    setTicker(newTicker ?? { symbol: "" });
  }

  return (
    <Stack h="100%" gap={0}>
      <Navbar>
        <SearchBar
          value={ticker}
          onTickerSelect={handleTickerInput}
          styles={{ marginLeft: 8 }}
        />
      </Navbar>
      <Group h="100%" align="stretch" gap={0} wrap="nowrap">
        <NewsFeed length={30} cardStyles={{ width: "20%", height: "100%" }} />
        <ChartArea
          ticker={ticker}
          cardStyles={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            paddingBottom: 28,
          }}
        />
        <WatchlistCard cardStyles={{ width: "15%", height: "100%" }} />
      </Group>
    </Stack>
  );
}

export default FinanceDashboard;
