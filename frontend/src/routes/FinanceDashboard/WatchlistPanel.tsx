import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItemButton,
  Divider,
  Typography,
  Box,
  SxProps,
} from "@mui/material";
import StockChart from "@components/StockChart.jsx";
import { useState, useEffect } from "react";
import { OHLCVData, Ticker } from "@shared/types";

function WatchListCard(cardStyles: SxProps = {}) {
  return (
    <Card sx={cardStyles}>
      <CardHeader title="Watchlist" />
      <CardContent sx={{ height: "100%", overflow: "auto" }}>
        <List sx={{ height: "100%" }}>
          <WatchListItem symbol="AAPL" />
          <WatchListItem symbol="MSFT" />
          <WatchListItem symbol="WMT" />
        </List>
      </CardContent>
    </Card>
  );
}

export default WatchListCard;

function WatchListItem(ticker: Ticker) {
  const [stockData, setStockData] = useState(null);

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
        data = data.slice(-20); // last 5 days
        setStockData(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchStockData();
  }, []);

  return (
    <>
      <ListItemButton
        sx={{
          height: "15%",
          display: "flex",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>{ticker.symbol}</Typography>
        <StockChart
          priceData={stockData}
          chartType="area"
          containerStyles={{ width: "50%", height: "100%" }}
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography>Last Price</Typography>
          <Typography>Last % Chg</Typography>
        </Box>
      </ListItemButton>
      <Divider sx={{ borderColor: "var(--color-text-primary)" }} />
    </>
  );
}
