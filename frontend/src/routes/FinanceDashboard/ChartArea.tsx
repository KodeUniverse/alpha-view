import StockChart from "@components/StockChart.tsx";
import { Card, Text, Group, Box, Stack, SegmentedControl } from "@mantine/core";
import { OHLCData, Ticker, VolumeData } from "@shared/types";
import MetricsCard from "./MetricsCard";
import { useBarsForTicker } from "@/hooks/queries";

interface ChartAreaProps {
  ticker: Ticker;
  cardStyles?: React.CSSProperties;
}
export default function ChartArea({ ticker, cardStyles = {} }: ChartAreaProps) {
  // need to add useMemo's for the dates and time series
  const start = new Date("2016-01-01");
  const end = new Date("2026-01-01");
  const { isLoading, isError, data, error } = useBarsForTicker(
    ticker,
    "daily",
    start,
    end,
  );

  const priceData: OHLCData[] = data
    ? data.map((bar) => {
        const { volume, ...transformed } = bar;
        return transformed;
      })
    : null;
  const volumeData: VolumeData[] = data
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

  return (
    <>
      <Card style={cardStyles}>
        <Group p="xs" ml="md">
          <Text size="36px" fw={700}>
            {ticker.symbol}
          </Text>
          <SegmentedControl
            data={["intraday", "daily", "weekly", "monthly"]}
            withItemsBorders={false}
          ></SegmentedControl>
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
                  chartType="candle"
                  timeScale={false}
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
