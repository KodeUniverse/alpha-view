import StockChart from "@components/StockChart.jsx";
import { useState, useEffect, useRef } from "react";
import styles from "./ChartArea.module.css";
import { Card, CardContent, CardHeader } from "@mui/material";

export default function ChartArea({ symbol, cardStyles = {} }) {
  const [stockData, setStockData] = useState(null);
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

          let remaining = ["open", "low", "high", "close"];
          for (const key of remaining) {
            row[key] = Number(row[key]);
          }
          delete row.volume; // for now, will change to include this data in volume histogram in chart.
        }
        setStockData(resultData);
        setError(false);
        setLoading(false);
      } catch (e) {
        setError(true);
        console.log(
          `Error fetching stock data from ${import.meta.env.API_URL}/symbol/hist-ts/${symbol}/latest\n${e}`,
        );
      }
    };
    fetchStockData();
  }, [symbol]);
  return (
    <>
      <Card sx={cardStyles}>
        <CardHeader title="StockChart" />
        <CardContent sx={{ height: "100%", overflow: "auto" }}>
          {isLoading && !isError && <p>Fetching data for symbol...</p>}
          {isError && <p>Error fetching data.</p>}
          {!isLoading && !isError && (
            <StockChart
              data={stockData}
              chartType="candle"
              containerStyles={{ width: "100%", height: "100%" }}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
