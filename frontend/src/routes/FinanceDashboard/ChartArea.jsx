import StockChart from "@components/StockChart.tsx";
import { useState, useEffect, useRef } from "react";
import { Box, Card, CardContent, CardHeader, Typography } from "@mui/material";

export default function ChartArea({ symbol, cardStyles = {} }) {
  const [priceData, setPriceData] = useState(null);
  const [volumeData, setVolumeData] = useState(null);
  const [isError, setError] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStockData = async () => {
      if (!symbol) {
        setLoading(false);
        setError(false);
        return;
      }
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
        setLoading(false);
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
        <CardContent sx={{ height: "100%", overflow: "auto" }}>
          {!symbol && <Typography>Please enter a ticker.</Typography>}
          {isLoading && !isError && (
            <Typography>Fetching data for symbol...</Typography>
          )}
          {isError && <Typography>Error fetching data.</Typography>}
          {!isLoading && !isError && symbol && (
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
