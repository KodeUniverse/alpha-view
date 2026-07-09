import StockChart from "@components/StockChart.tsx";
import {
  Card,
  Text,
  Group,
  Box,
  Stack,
  SegmentedControl,
  Divider,
} from "@mantine/core";
import { OHLCData, Ticker, VolumeData, Frequency } from "@shared/types";
import MetricsCard from "./MetricsCard";
import { useBarsForTicker } from "@/hooks/queries";
import { useLiveTickerFeed } from "@/hooks/useLiveTickerFeed";
import { useState, useMemo, useEffect } from "react";

type ChartRange = "1d" | "5d" | "3m" | "6m" | "1y" | "3y" | "Max";

interface ChartAreaProps {
  ticker: Ticker;
  cardStyles?: React.CSSProperties;
}

interface ChartDisplayOptionsWidgetProps {
  onFreqChange: (value: string) => void;
  onRangeChange: (value: string) => void;
  frequency: Frequency;
  range: ChartRange;
}

function ChartDisplayOptionsWidget({
  onFreqChange,
  onRangeChange,
  frequency,
  range,
}: ChartDisplayOptionsWidgetProps) {
  return (
    <>
      <Stack style={{ gap: 5 }}>
        <Group style={{ display: "flex", justifyContent: "center" }}>
          <Text style={{ marginRight: "auto" }}>Frequency</Text>
          <SegmentedControl
            data={["intraday", "daily", "weekly", "monthly"]}
            withItemsBorders={false}
            size="sm"
            onChange={onFreqChange}
            value={frequency}
          />
        </Group>
        <Group style={{ display: "flex", justifyContent: "center" }}>
          <Text style={{ marginRight: "auto" }}>Data History</Text>
          <SegmentedControl
            data={["1d", "5d", "3m", "6m", "1y", "3y", "Max"]}
            withItemsBorders={false}
            size="sm"
            onChange={onRangeChange}
            value={range}
          />
        </Group>
      </Stack>
    </>
  );
}

export default function ChartArea({ ticker, cardStyles = {} }: ChartAreaProps) {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [range, setRange] = useState<ChartRange>("3m");

  console.log(`Current ticker prop: ${ticker.symbol}`);
  const tick = useLiveTickerFeed([ticker]);
  console.log(`Live Ticker Data: ${JSON.stringify(tick)}`);

  const { start, end } = useMemo(() => {
    let end = new Date();
    let start: Date;

    switch (range) {
      case "1d":
        // set range to US market hours on current day
        start = new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate(),
          9,
          30,
        );
        end = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate(),
          16,
          0,
        );
        break;
      case "5d":
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 5);
        break;
      case "3m":
        start = new Date(end.getFullYear(), end.getMonth() - 3, end.getDate());
        break;
      case "6m":
        start = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate());
        break;
      case "1y":
        start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
        break;
      case "3y":
        start = new Date(end.getFullYear() - 3, end.getMonth(), end.getDate());
        break;
      case "Max":
        start = new Date(end.getFullYear() - 5, end.getMonth(), end.getDate());
        break;
    }
    return { start, end };
  }, [range]);

  const { isLoading, isError, data, error } = useBarsForTicker(
    ticker,
    frequency,
    start,
    end,
  );

  // useEffect(() => {
  //   if (!priceData || !volumeData) return;

  //   priceData.index
  // }, [JSON.stringify(tick)]);
  const priceData: OHLCData[] | null = data
    ? data.map((bar) => {
        const { volume, ...transformed } = bar;
        return transformed;
      })
    : null;
  const volumeData: VolumeData[] | null = data
    ? data.map((bar) => {
        let volumeBarColor: string;
        if (bar.open < bar.close) {
          volumeBarColor = "#26a69a";
        } else {
          volumeBarColor = "#ef5350";
        }
        const newRow = {
          time: bar.time,
          value: Number(bar.volume),
          color: volumeBarColor,
        };
        return newRow;
      })
    : null;

  const handleFreqChange = (newFreq: Frequency) => {
    setFrequency(newFreq);
  };
  const handleRangeChange = (newRange: ChartRange) => {
    setRange(newRange);
  };

  return (
    <>
      <Card style={cardStyles}>
        <Group p="xs" ml="md">
          <Text size="36px" fw={700} style={{ marginRight: "auto" }}>
            {ticker.symbol}
          </Text>
          <ChartDisplayOptionsWidget
            onFreqChange={handleFreqChange}
            onRangeChange={handleRangeChange}
            frequency={frequency}
            range={range}
          />
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
                  latestTick={tick}
                  frequency={frequency}
                  chartType="candle"
                  timeScale={true}
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
