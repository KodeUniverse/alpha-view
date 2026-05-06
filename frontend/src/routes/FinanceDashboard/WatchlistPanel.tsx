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
import { OHLCVData, PriceData, Ticker } from "@shared/types";

interface WatchListCardProps {
  cardStyles?: SxProps;
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  return (
    <Card sx={cardStyles}>
      <CardHeader title="Watchlist" />
      <CardContent sx={{ height: "100%", overflow: "auto" }}>
        <List sx={{ height: "100%" }}>
          <WatchListItem ticker={{ symbol: "AAPL" }} />
          <WatchListItem ticker={{ symbol: "MSFT" }} />
          <WatchListItem ticker={{ symbol: "WMT" }} />
        </List>
      </CardContent>
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
      <ListItemButton
        sx={{
          height: 75,
          minHeight: 30,
          display: "flex",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>{ticker.symbol}</Typography>
        <StockChart
          priceData={stockData}
          chartType="area"
          containerStyles={{ width: "30%", height: "100%" }}
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

export default WatchListCard;
