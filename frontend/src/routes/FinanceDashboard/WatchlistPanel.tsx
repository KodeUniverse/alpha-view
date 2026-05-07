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
        data = data.slice(-5);
        setStockData(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchStockData();
  }, []);

  return (
    <Card style={{ padding: 0 }}>
      <Group
        style={{
          height: 75,
          minHeight: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text fw={700}>{ticker.symbol}</Text>
        <StockChart
          priceData={stockData}
          chartType="area"
          containerStyles={{ width: 50, height: 35 }}
          showHorizAxis={false}
          showVertAxis={false}
          interactive={false}
          showGrid={false}
        />
        <Group gap={5}>
          <Text>$123.45</Text>
          <Text>+$2.7653</Text>
          <Text>+2.24%</Text>
        </Group>
      </Group>
    </Card>
  );
}

export default WatchListCard;
