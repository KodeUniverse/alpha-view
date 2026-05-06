import { Card, Text, Group, Box, Stack, Divider } from "@mantine/core";
import StockChart from "@components/StockChart.jsx";
import { useState, useEffect } from "react";
import { OHLCVData, PriceData, Ticker } from "@shared/types";

interface WatchListCardProps {
  cardStyles?: React.CSSProperties;
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  return (
    <Card style={cardStyles}>
      <Text fw={700} size="lg" mb={10}>
        Watchlist
      </Text>
      <Stack style={{ height: "100%" }} gap={0}>
        <WatchListItem ticker={{ symbol: "AAPL" }} />
        <WatchListItem ticker={{ symbol: "MSFT" }} />
        <WatchListItem ticker={{ symbol: "WMT" }} />
      </Stack>
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
    <Box>
      <Group
        style={{
          height: 75,
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text fw={700}>{ticker.symbol}</Text>
        <Box style={{ flex: 1, height: "100%" }}>
          <StockChart
            priceData={stockData}
            chartType="area"
            containerStyles={{ flex: 1, minWidth: 20, height: "100%" }}
          />
        </Box>
        <Stack style={{ flex: 0, minWidth: 45 }} gap={0}>
          <Text>Last Price</Text>
          <Text>Last % Chg</Text>
        </Stack>
      </Group>
      <Divider color="var(--color-text-primary)" />
    </Box>
  );
}

export default WatchListCard;
