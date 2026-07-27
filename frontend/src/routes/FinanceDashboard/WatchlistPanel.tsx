import { Card, Text, Group, Box, Stack, Divider } from "@mantine/core";
import StockChart from "@/components/StockChart.jsx";
import { useState, useEffect, useMemo } from "react";
import { OHLCVData, PriceData, Ticker } from "@shared/types";
import { useBarsForTicker } from "@/hooks/queries";

interface WatchListCardProps {
  cardStyles?: React.CSSProperties;
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  return (
    <Card style={cardStyles}>
      <Text fw={700} size="lg" mb={10}>
        Watchlist
      </Text>
      <Stack style={{ height: "100%" }}>
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
  const { start, end } = useMemo(() => {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      9,
      30,
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      16,
      0,
    );
    return { end, start };
  }, []);

  //TODO: consider moving this to one fetch in WatchListCard for performance.
  // Also consider creating separate hook for fetching just price rather than OHLCV.

  const response = useBarsForTicker(ticker, "intraday", start, end);
  const priceData: PriceData[] = response.data
    ? response.data.map((bar) => {
        return { value: bar.close, time: bar.time };
      })
    : null;
  //  useEffect(() => {
  //    const fetchStockData = async () => {
  //      try {
  //        const res = await fetch(
  //          `${import.meta.env.API_URL}/symbol/hist-ts/${ticker.symbol}/latest`,
  //        );
  //        if (!res.ok) {
  //          throw new Error(`HTTP ${res.status}: Could not fetch stock data.`);
  //        }
  //
  //        let data = await res.json();
  //        data = data.map((row: { time: string; close: number }) => ({
  //          time: new Date(row.time),
  //          value: row.close,
  //        }));
  //        data = data.slice(-5);
  //        setStockData(data);
  //      } catch (error) {
  //        console.log(error);
  //      }
  //    };
  //    fetchStockData();
  //  }, []);

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
          priceData={priceData}
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
