import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItemButton,
  Divider,
  Typography,
  Box,
} from "@mui/material";
import StockChart from "@components/StockChart.jsx";
import { useState, useEffect } from "react";

function WatchListCard({ cardStyles = {} }) {
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

function WatchListItem({ symbol }) {
  const [stockData, setStockData] = useState(null);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.API_URL}/symbol/hist-ts/${symbol}/latest`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Could not fetch stock data.`);
        }

        let data = await res.json();
        data = data.map((row) => {
          const { close: value, time } = row;
          return { time: row.time.split("T")[0], value: Number(value) };
        });
        data = data.slice(-20); // last 5 days
        console.log(`after map, data: ${JSON.stringify(data[0])}`);
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
        <Typography sx={{ fontWeight: 700 }}>{symbol}</Typography>
        <StockChart
          data={stockData}
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
