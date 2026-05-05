import StockChart from "@components/StockChart.tsx";
import { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  SxProps,
  Typography,
} from "@mui/material";
import { OHLCVData, Ticker, VolumeData } from "@shared/types";

interface ChartAreaProps {
  ticker: Ticker;
  cardStyles?: SxProps;
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
  }, [ticker]);

  return (
    <>
      <Card sx={cardStyles}>
        <Box sx={{ padding: 2, marginLeft: 2 }}>
          <Typography sx={{ fontSize: 36, fontWeight: 700 }}>
            {ticker.symbol}
          </Typography>
        </Box>
        <CardContent sx={{ height: "100%", overflow: "auto" }}>
          {!ticker.symbol && <Typography>Please enter a ticker.</Typography>}
          {isLoading && !isError && (
            <Typography>Fetching data for symbol...</Typography>
          )}
          {isError && <Typography>Error fetching data.</Typography>}
          {!isLoading && !isError && ticker.symbol && (
            <Card sx={{ height: "98%" }}>
              <StockChart
                priceData={priceData}
                volumeData={volumeData}
                chartType="candle"
                timeScale={false}
                containerStyles={{ width: "100%", height: "100%" }}
              />
            </Card>
          )}
        </CardContent>
      </Card>
    </>
  );
}
