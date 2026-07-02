import StockChart from "@components/StockChart.tsx";
import { useState, useEffect } from "react";
import { Card, Text, Group, Box, Stack } from "@mantine/core";
import { OHLCVData, Ticker, VolumeData } from "@shared/types";
import MetricsCard from "./MetricsCard";

interface ChartAreaProps {
  ticker: Ticker;
  cardStyles?: React.CSSProperties;
}
export default function ChartArea({ ticker, cardStyles = {} }: ChartAreaProps) {
  const [priceData, setPriceData] = useState(null);
  const [volumeData, setVolumeData] = useState(null);
  const [isError, setError] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStockData = async () => {
      if (!ticker.symbol) {
        setLoading(false);
        setError(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.API_URL}/symbol/hist-ts/${ticker.symbol}/latest`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Error fetching stock data`);
        }

        const resultData = await res.json();

        for (const row of resultData) {
          row.time = row.time.split("T")[0];
        }
        const ohlcData = resultData.map((row: OHLCVData) => {
          const newRow = { ...row };
          delete newRow.volume;
          let remaining = ["open", "low", "high", "close"];
          for (const key of remaining) {
            newRow[key] = Number(newRow[key]);
          }
          return newRow;
        });
        const volumeData = resultData.map((row: OHLCVData) => {
          let volumeBarColor: string;
          if (row.open < row.close) {
            volumeBarColor = "#26a69a";
          } else {
            volumeBarColor = "#ef5350";
          }
          const newRow = {
            time: row.time,
            value: Number(row.volume),
            color: volumeBarColor,
          };
          return newRow;
        });

        setPriceData(ohlcData);
        setVolumeData(volumeData);
        setError(false);
        setLoading(false);
      } catch (e) {
        setError(true);
        setLoading(false);
        console.log(
          `Error fetching stock data from ${import.meta.env.API_URL}/symbol/hist-ts/${ticker.symbol}/latest\n\n${e}`,
        );
      }
    };
    fetchStockData();
  }, [ticker.symbol]);

  return (
    <>
      <Card style={cardStyles}>
        <Group p="xs" ml="md">
          <Text size="36px" fw={700}>
            {ticker.symbol}
          </Text>
        </Group>
        <Box style={{ height: "100%" }}>
          {!ticker.symbol && <Text>Please enter a ticker.</Text>}
          {isLoading && !isError && <Text>Fetching data for symbol...</Text>}
          {isError && <Text>Error fetching data.</Text>}
          {!isLoading && !isError && ticker.symbol && (
            <Stack h={"100%"}>
              <Card h="98%">
                <StockChart
                  priceData={priceData}
                  volumeData={volumeData}
                  chartType="candle"
                  timeScale={false}
                  containerStyles={{
                    width: "100%",
                    minHeight: 0,
                    margin: 5,
                    flex: 1,
                  }}
                />
              </Card>
              <MetricsCard columns={6} styles={{ overflow: "visible" }} />
            </Stack>
          )}
        </Box>
      </Card>
    </>
  );
}
