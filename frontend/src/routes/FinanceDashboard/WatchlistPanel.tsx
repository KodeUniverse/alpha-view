import { Card, List, ListItem, Text, Group, Box, Stack, Divider } from "@mantine/core";
import StockChart from "@components/StockChart.jsx";
import { useState, useEffect } from "react";
import { OHLCVData, PriceData, Ticker } from "@shared/types";

interface WatchListCardProps {
  cardStyles?: React.CSSProperties;
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  return (
    <Card style={cardStyles}>
      <Text fw={700} size="lg" mb={10}>Watchlist</Text>
      <List style={{ height: "100%" }}>
        <WatchListItem ticker={{ symbol: "AAPL" }} />
        <WatchListItem ticker={{ symbol: "MSFT" }} />
        <WatchListItem ticker={{ symbol: "WMT" }} />
      </List>
    </Card>
  );
}

interface WatchListItemProps {
  ticker: Ticker;
}
function WatchListItem({ ticker }: WatchListItemProps) {
  const [stockData, setStockData] = useState<PriceData[]>([]);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.API_URL}/symbol/hist-ts/${ticker.symbol}/latest`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Could not fetch stock data.`);
        }

        let data = await res.json();
        data = data.map((row: OHLCVData) => {
          const { close: value, time } = row;
          return { time: row.time.split("T")[0], value: Number(value) };
        });
        data = data.slice(-10);
        setStockData(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchStockData();
  }, []);

  return (
    <>
      <ListItem
        style={{
          height: 75,
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text fw={700}>{ticker.symbol}</Text>
        <Box style={{ width: "30%", height: "100%" }}>
          <StockChart
            priceData={stockData}
            chartType="area"
            containerStyles={{ width: "100%", height: "100%" }}
          />
        </Box>
        <Stack style={{ flex: 1, minWidth: 0 }} gap={0}>
          <Text>Last Price</Text>
          <Text>Last % Chg</Text>
        </Stack>
      </ListItem>
      <Divider color="var(--color-text-primary)" />
    </>
  );
}

export default WatchListCard;
