import StockChart from "@components/StockChart.jsx";
import { useState, useEffect, useRef } from "react";
import styles from "./ChartArea.module.css";
import { Box, Card, CardContent, CardHeader, Typography } from "@mui/material";

export default function ChartArea({ symbol, cardStyles = {} }) {
  const [priceData, setPriceData] = useState(null);
  const [volumeData, setVolumeData] = useState(null);
  const [isError, setError] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.API_URL}/symbol/hist-ts/${symbol}/latest`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Error fetching stock data`);
        }

        const resultData = await res.json();

        for (const row of resultData) {
          row.time = row.time.split("T")[0];
        }
        const ohlcData = resultData.map((row) => {
          const newRow = { ...row };
          delete newRow.volume;
          let remaining = ["open", "low", "high", "close"];
          for (const key of remaining) {
            newRow[key] = Number(newRow[key]);
          }
          return newRow;
        });
        const volumeData = resultData.map((row) => {
          let volumeBarColor;
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
        console.log(
          `Error fetching stock data from ${import.meta.env.API_URL}/symbol/hist-ts/${symbol}/latest\n\n${e}`,
        );
      }
    };
    fetchStockData();
  }, [symbol]);
  return (
    <>
      <Card sx={cardStyles}>
        <Box sx={{ padding: 2, marginLeft: 2 }}>
          <Typography sx={{ fontSize: 36, fontWeight: 700 }}>
            {symbol}
          </Typography>
        </Box>
        <CardContent sx={{ height: "100%", overflow: "hidden" }}>
          {isLoading && !isError && <p>Fetching data for symbol...</p>}
          {isError && <p>Error fetching data.</p>}
          {!isLoading && !isError && (
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
