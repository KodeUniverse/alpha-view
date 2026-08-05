import StockChart from "@/components/StockChart.tsx";
import {
  Card,
  Text,
  Group,
  Box,
  Stack,
  SegmentedControl,
  Checkbox,
} from "@mantine/core";
import { OHLCData, Ticker, VolumeData, Frequency } from "@shared/types";
import { useBarsForTicker } from "@/hooks/queries";
import { useLiveTickerFeed } from "@/hooks/useLiveTickerFeed";
import { useState, useMemo } from "react";

type ChartRange = "1d" | "5d" | "3m" | "6m" | "1y" | "3y" | "Max";

interface ChartIndicators {
  sma: boolean;
  ema: boolean;
  bollinger: boolean;
}

interface ChartAreaProps {
  ticker: Ticker;
  cardStyles?: React.CSSProperties;
}

interface ChartDisplayOptionsWidgetProps {
  onFreqChange: (value: string) => void;
  onRangeChange: (value: string) => void;
  onIndicatorsChange: (indicators: ChartIndicators) => void;
  frequency: Frequency;
  range: ChartRange;
  indicators: ChartIndicators;
}

function ChartDisplayOptionsWidget({
  onFreqChange,
  onRangeChange,
  onIndicatorsChange,
  frequency,
  range,
  indicators,
}: ChartDisplayOptionsWidgetProps) {
  const handleIndicatorToggle = (key: keyof ChartIndicators) => {
    onIndicatorsChange({ ...indicators, [key]: !indicators[key] });
  };

  return (
    <>
      <Stack style={{ gap: 5 }}>
        <Group
          style={{
            display: "flex",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "var(--color-background-secondary)",
            borderRadius: 5,
            padding: 5,
          }}
        >
          <Text
            style={{
              marginRight: "auto",
              color: "var(--color-text-secondary)",
            }}
          >
            Frequency
          </Text>
          <SegmentedControl
            data={["intraday", "daily", "weekly", "monthly"]}
            withItemsBorders={false}
            size="sm"
            onChange={onFreqChange}
            value={frequency}
          />
        </Group>
        <Group style={{ display: "flex", justifyContent: "center" }}>
          <Text
            style={{
              marginRight: "auto",
              color: "var(--color-text-secondary)",
            }}
          >
            Data History
          </Text>

          <SegmentedControl
            data={["1d", "5d", "3m", "6m", "1y", "3y", "Max"]}
            withItemsBorders={false}
            size="sm"
            onChange={onRangeChange}
            value={range}
          />
        </Group>
        <Group
          style={{
            display: "flex",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "var(--color-background-secondary)",
            borderRadius: 5,
            padding: 5,
          }}
        >
          <Text
            style={{
              marginRight: "auto",
              color: "var(--color-text-secondary)",
            }}
          >
            Indicators
          </Text>
          <Group gap="xs">
            <Checkbox
              label="SMA"
              size="xs"
              checked={indicators.sma}
              onChange={() => handleIndicatorToggle("sma")}
            />
            <Checkbox
              label="EMA"
              size="xs"
              checked={indicators.ema}
              onChange={() => handleIndicatorToggle("ema")}
            />
            <Checkbox
              label="Bollinger"
              size="xs"
              checked={indicators.bollinger}
              onChange={() => handleIndicatorToggle("bollinger")}
            />
          </Group>
        </Group>
      </Stack>
    </>
  );
}

export default function ChartArea({ ticker, cardStyles = {} }: ChartAreaProps) {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [range, setRange] = useState<ChartRange>("3m");
  const [indicators, setIndicators] = useState<ChartIndicators>({
    sma: false,
    ema: false,
    bollinger: false,
  });

  const liveFeed = useLiveTickerFeed([ticker]);
  const tick = liveFeed[ticker.symbol];

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

  const dailyStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);
  // Memoized, not inline `new Date()` -- an unstable value here would
  // change the query key (and refetch) on every live-tick re-render.
  const dailyEnd = useMemo(() => new Date(), []);
  const { data: dailyBars } = useBarsForTicker(ticker, "daily", dailyStart, dailyEnd);

  const { isLoading, isError, data } = useBarsForTicker(
    ticker,
    frequency,
    start,
    end,
  );
  const priceData: OHLCData[] | null = data
    ? data.map((bar) => ({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
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

  const { lastPrice, change, percentChange } = useMemo(() => {
    const liveClose =
      tick?.minuteBar?.close ?? tick?.dailyBar?.close;
    const lastPrice =
      liveClose ??
      (priceData && priceData.length > 0
        ? priceData[priceData.length - 1].close
        : null);
    let prevClose: number | null = null;
    if (dailyBars) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const prior = dailyBars.filter((bar) => bar.time < todayStart);
      if (prior.length > 0) prevClose = prior[prior.length - 1].close;
    }
    if (lastPrice != null && prevClose != null) {
      const change = lastPrice - prevClose;
      return {
        lastPrice,
        change,
        percentChange: (change / prevClose) * 100,
      };
    }
    return { lastPrice, change: null, percentChange: null };
  }, [tick, priceData, dailyBars]);

  const isUp = change != null && change >= 0;
  const changeColor = change == null ? "var(--color-text-secondary)" : isUp ? "#26a69a" : "#ef5350";

  const handleFreqChange = (newFreq: Frequency) => {
    setFrequency(newFreq);
  };
  const handleRangeChange = (newRange: ChartRange) => {
    setRange(newRange);
  };

  return (
    <>
      <Card style={cardStyles}>
        <Group
          p="xs"
          ml="md"
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
        >
          <Stack gap={2} mr="auto" style={{ minWidth: 0 }}>
            <Group gap={12} wrap="nowrap">
              <Text size="32px" fw={700} style={{ lineHeight: 1.1 }}>
                {ticker.symbol}
              </Text>
              <Group
                gap={8}
                wrap="nowrap"
                style={{
                  border: "1px solid",
                  borderColor: changeColor,
                  borderRadius: 999,
                  padding: "2px 10px",
                  backgroundColor: "var(--color-background-tertiary)",
                }}
              >
                <Text
                  size="md"
                  fw={700}
                  style={{
                    color: changeColor,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {lastPrice != null ? `$${lastPrice.toFixed(2)}` : "—"}
                </Text>
                <Text
                  size="sm"
                  fw={600}
                  style={{
                    color: changeColor,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {percentChange != null
                    ? `${isUp ? "+" : ""}${percentChange.toFixed(2)}%`
                    : ""}
                </Text>
              </Group>
            </Group>
            <Text size="sm" c="dimmed" truncate>
              {ticker.name ?? ticker.symbol}
            </Text>
          </Stack>
          <ChartDisplayOptionsWidget
            onFreqChange={handleFreqChange}
            onRangeChange={handleRangeChange}
            onIndicatorsChange={setIndicators}
            frequency={frequency}
            range={range}
            indicators={indicators}
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
                  indicators={indicators}
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
            </Stack>
          )}
        </Box>
      </Card>
    </>
  );
}
