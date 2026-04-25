import StockChart from "@components/StockChart.jsx";
import { useState, useEffect, useRef } from "react";
import styles from "./ChartArea.module.css";
import { Card, CardContent, CardHeader } from "@mui/material";

export default function ChartArea({ cardStyles = {} }) {
    const [symbol, setSymbol] = useState("AAPL");
    const [stockData, setStockData] = useState(null);

    const inputValRef = useRef(null);

    function handleStockSubmit() {
        console.log(`Submit event: ${inputValRef.current.value}`);
        console.log(`State:${symbol}`);
        setSymbol(inputValRef.current.value);
    }

    useEffect(() => {
        console.log(`State after:${symbol}`);
        const fetchStockData = async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.API_URL}/stock-data/hist-ts/${symbol}/latest`,
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
            } catch (e) {
                console.log(
                    `Error fetching stock data from ${import.meta.env.API_URL}/stock-data/hist-ts/${symbol}/latest\n${e}`,
                );
            }
        };
        fetchStockData();
    }, [symbol]);
    return (
        <Card sx={cardStyles}>
            <CardHeader title="StockChart" />
            <CardContent sx={{ height: "100%", overflow: "auto" }}>
                <div className={styles["chart-area"]}>
                    <input
                        ref={inputValRef}
                        type="text"
                        placeholder="Enter ticker, symbol, etc."
                        defaultValue={symbol}
                    />
                    <button
                        style={{ height: "25px", width: "50px" }}
                        onClick={handleStockSubmit}
                    >
                        Submit
                    </button>
                    <StockChart data={stockData} chartType="candle" containerStyles={{ width: "100%", height: "100%" }} />
                </div>
            </CardContent>
        </Card>
    );
}
