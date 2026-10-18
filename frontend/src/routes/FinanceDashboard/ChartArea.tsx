import StockChart from "@/components/StockChart.tsx";
import {
  Card,
  Text,
  Group,
  Box,
  Stack,
  SegmentedControl,
  Menu,
  Button,
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
} from "@tabler/icons-react";
import { OHLCData, Ticker, VolumeData, Frequency } from "@/types";
import { useBarsForTicker, useSymbolList } from "@/hooks/queries";
import { useLiveTickerFeed } from "@/hooks/useLiveTickerFeed";
import { useState, useMemo } from "react";
import { isSameTradingDay } from "@/utils/dates";
import {
  BOLLINGER_COLORS,
  BOLLINGER_MULTIPLIER,
  BOLLINGER_PERIOD,
  ChartIndicators,
  DEFAULT_INDICATORS,
  INDICATOR_PERIODS,
  MoverFamily,
  PERIOD_UNIT,
  indicatorWarmupStart,
  moverColor,
} from "@/utils/indicators";

type ChartRange = "1d" | "5d" | "3m" | "6m" | "1y" | "3y" | "Max";

const FREQUENCIES: Frequency[] = ["intraday", "daily", "weekly", "monthly"];
const RANGES: ChartRange[] = ["1d", "5d", "3m", "6m", "1y", "3y", "Max"];

const MOVER_LABELS: Record<MoverFamily, { group: string; short: string }> = {
  sma: { group: "Simple Moving Average", short: "SMA" },
  ema: { group: "Exponential Moving Average", short: "EMA" },
};

interface ChartAreaProps {
  ticker: Ticker;
  cardStyles?: React.CSSProperties;
}

interface IndicatorSwatchProps {
  color: string;
}

// Small colour chip so the menu shows the line it is about to toggle. Square, because every
// other control in this header is square.
function IndicatorSwatch({ color }: IndicatorSwatchProps) {
  return (
    <Box
      component="span"
      style={{
        width: 8,
        height: 8,
        backgroundColor: color,
        borderRadius: 1,
        flexShrink: 0,
      }}
    />
  );
}

interface MovingAverageSubmenuProps {
  family: MoverFamily;
  periods: number[];
  unit: string;
  indicators: ChartIndicators;
  onToggle: (family: MoverFamily, period: number, checked: boolean) => void;
}

function MovingAverageSubmenu({
  family,
  periods,
  unit,
  indicators,
  onToggle,
}: MovingAverageSubmenuProps) {
  const enabledCount = periods.filter(
    (period) => indicators[family][period],
  ).length;
  const { group, short } = MOVER_LABELS[family];

  return (
    <Menu.Sub position="right-start">
      <Menu.Sub.Target>
        <Menu.Sub.Item
          leftSection={
            <IndicatorSwatch color={moverColor(family, periods[0])} />
          }
        >
          <Group gap={6} wrap="nowrap">
            <Text size="sm">{group}</Text>
            {enabledCount > 0 && (
              <Text
                size="xs"
                c="dimmed"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {enabledCount}
              </Text>
            )}
          </Group>
        </Menu.Sub.Item>
      </Menu.Sub.Target>
      <Menu.Sub.Dropdown>
        {periods.map((period) => (
          <Menu.CheckboxItem
            key={period}
            checked={indicators[family][period] === true}
            onChange={(checked) => onToggle(family, period, checked)}
          >
            <Group gap={8} wrap="nowrap">
              <IndicatorSwatch color={moverColor(family, period)} />
              <Text size="sm">
                {short} {period}
                {unit}
              </Text>
            </Group>
          </Menu.CheckboxItem>
        ))}
      </Menu.Sub.Dropdown>
    </Menu.Sub>
  );
}

interface IndicatorSettingsMenuProps {
  frequency: Frequency;
  indicators: ChartIndicators;
  onIndicatorsChange: (indicators: ChartIndicators) => void;
}

function IndicatorSettingsMenu({
  frequency,
  indicators,
  onIndicatorsChange,
}: IndicatorSettingsMenuProps) {
  const periods = INDICATOR_PERIODS[frequency];
  const unit = PERIOD_UNIT[frequency];
  const enabledCount =
    periods.filter((period) => indicators.sma[period] === true).length +
    periods.filter((period) => indicators.ema[period] === true).length +
    (indicators.bollinger ? 1 : 0);

  const handleToggle = (
    family: MoverFamily,
    period: number,
    checked: boolean,
  ) => {
    onIndicatorsChange({
      ...indicators,
      [family]: { ...indicators[family], [period]: checked },
    });
  };

  return (
    // closeOnItemClick stays off (Mantine's default): toggling one period must not dismiss the
    // submenu or the parent menu, otherwise a four-period SMA takes four re-opens.
    <Menu shadow="md" width={230} position="bottom-end" offset={4}>
      <Menu.Target>
        <Button
          variant="filled"
          size="compact-sm"
          justify="space-between"
          w="9.5em"
          rightSection={<IconChevronDown size={12} />}
          styles={{
            root: { borderRadius: 3, paddingInline: 8, marginLeft: "auto" },
            label: {
              fontSize: "var(--font-size-sm)",
            },
          }}
        >
          Indicators{enabledCount > 0 ? ` (${enabledCount})` : ""}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <MovingAverageSubmenu
          family="sma"
          periods={periods}
          unit={unit}
          indicators={indicators}
          onToggle={handleToggle}
        />
        <MovingAverageSubmenu
          family="ema"
          periods={periods}
          unit={unit}
          indicators={indicators}
          onToggle={handleToggle}
        />
        <Menu.Divider />
        <Menu.CheckboxItem
          checked={indicators.bollinger === true}
          onChange={(checked) =>
            onIndicatorsChange({ ...indicators, bollinger: checked })
          }
        >
          <Group gap={8} wrap="nowrap">
            <IndicatorSwatch color={BOLLINGER_COLORS.mid} />
            <Text size="sm">
              Bollinger Bands ({BOLLINGER_PERIOD}, {BOLLINGER_MULTIPLIER}σ)
            </Text>
          </Group>
        </Menu.CheckboxItem>
      </Menu.Dropdown>
    </Menu>
  );
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
  // One box, two stacked rows, no labels: the segmented control reads as the control it is,
  // and the box keeps both rows reading as one settings cluster next to the price.
  const segmentStyles = {
    root: { backgroundColor: "transparent" },
    label: { paddingInline: 6 },
  };

  return (
    <Stack gap={4} style={{ alignItems: "stretch" }}>
      <Stack
        gap={2}
        style={{
          border: "1px solid",
          borderColor: "var(--color-background-tertiary)",
          borderRadius: 3,
          padding: 3,
        }}
      >
        <SegmentedControl
          data={FREQUENCIES}
          withItemsBorders={false}
          size="xs"
          fullWidth
          radius={3}
          onChange={onFreqChange}
          value={frequency}
          styles={segmentStyles}
        />
        <SegmentedControl
          data={RANGES}
          withItemsBorders={false}
          size="xs"
          fullWidth
          radius={3}
          onChange={onRangeChange}
          value={range}
          styles={segmentStyles}
        />
      </Stack>
      <IndicatorSettingsMenu
        frequency={frequency}
        indicators={indicators}
        onIndicatorsChange={onIndicatorsChange}
      />
    </Stack>
  );
}

export default function ChartArea({ ticker, cardStyles = {} }: ChartAreaProps) {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [range, setRange] = useState<ChartRange>("3m");
  const [indicators, setIndicators] =
    useState<ChartIndicators>(DEFAULT_INDICATORS);

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

  // The request covers the visible range AND the warm-up needed by the longest indicator, so
  // one response serves both: bars left of `start` seed the moving averages, and the rest are
  // the chart. Without this extra data some moving averages cannot show for the visible window.
  const fetchStart = useMemo(
    () => indicatorWarmupStart(frequency, start),
    [frequency, start],
  );

  const dailyStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);
  // Memoized, not inline `new Date()` -- an unstable value here would
  // change the query key (and refetch) on every live-tick re-render.
  const dailyEnd = useMemo(() => new Date(), []);
  const { data: dailyBars } = useBarsForTicker(
    ticker,
    "daily",
    dailyStart,
    dailyEnd,
  );

  const {
    isLoading,
    isError,
    data: allBars,
  } = useBarsForTicker(ticker, frequency, fetchStart, end);

  // Drop the warm-up prefix so the chart shows exactly the visible window. Only the LOWER bound
  // is re-applied here: the provider already applied `end` when it built this response, and
  // re-checking it client-side would drop a bar the provider deliberately included -- the
  // in-progress bar, whose timestamp can sit at or past the requested end depending on how the
  // exchange stamps a partial period.
  const data = useMemo(() => {
    if (!allBars) return null;
    return allBars.filter((bar) => bar.time >= start);
  }, [allBars, start]);

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

  const { lastPrice, change, percentChange, showChange } = useMemo(() => {
    // The live feed carries BOTH a minute bar and a daily bar, updated every
    // minute. Which one is authoritative depends on the selected frequency:
    // intraday tracks the minute bar, everything else tracks the running daily
    // bar. The minute bar is always the fresher print of the two, but comparing
    // it against prevClose on a daily chart would mix series.
    const liveBar = frequency === "intraday" ? tick?.minuteBar : tick?.dailyBar;
    const lastSeriesBar =
      priceData && priceData.length > 0
        ? priceData[priceData.length - 1]
        : null;
    const shownBar = liveBar ?? lastSeriesBar;
    const lastPrice = shownBar ? shownBar.close : null;

    let prevCloseBar: OHLCData | null = null;
    if (dailyBars) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const prior = dailyBars.filter((bar) => bar.time < todayStart);
      if (prior.length > 0) prevCloseBar = prior[prior.length - 1];
    }

    if (lastPrice != null && prevCloseBar != null) {
      const change = lastPrice - prevCloseBar.close;
      // When the newest price and the previous close come from the SAME calendar
      // day, the comparison is a value against itself -- the market is shut and
      // nothing has moved since that session's close. Reporting 0.00% there reads
      // as "flat today" when it actually means "not trading", so show nothing.
      const sameSession =
        shownBar != null && isSameTradingDay(shownBar.time, prevCloseBar.time);
      return {
        lastPrice,
        change,
        percentChange: (change / prevCloseBar.close) * 100,
        showChange: !sameSession,
      };
    }
    return { lastPrice, change: null, percentChange: null, showChange: false };
  }, [tick, priceData, dailyBars, frequency]);

  const isUp = change != null && change >= 0;
  const changeColor =
    change == null
      ? "var(--color-text-secondary)"
      : isUp
        ? "#26a69a"
        : "#ef5350";

  // The search result carries name + exchange, but the default ticker (and anything restored
  // without them) only has a symbol. The symbol list is already cached by the search bar, so
  // resolving from it costs no extra request.
  const { data: symbols } = useSymbolList();
  const exchange = useMemo(() => {
    if (ticker.exchange) return ticker.exchange;
    return symbols?.find((s) => s.symbol === ticker.symbol)?.exchange ?? null;
  }, [ticker.exchange, ticker.symbol, symbols]);
  const displayName = ticker.name ?? ticker.symbol;

  const handleFreqChange = (newFreq: Frequency) => {
    // Each frequency offers a different period set (see INDICATOR_PERIODS), so drop anything
    // the incoming frequency will not draw. Frequency only changes here, so this is the one
    // place the pruning has to happen.
    const allowed = new Set(INDICATOR_PERIODS[newFreq]);
    const prune = (family: MoverFamily) =>
      Object.fromEntries(
        Object.entries(indicators[family]).filter(([period]) =>
          allowed.has(Number(period)),
        ),
      );
    setIndicators({
      sma: prune("sma"),
      ema: prune("ema"),
      bollinger: indicators.bollinger,
    });
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
            <Group gap={8} wrap="nowrap">
              <Text size="32px" fw={700} style={{ lineHeight: 1.1 }}>
                {ticker.symbol}
              </Text>
              {exchange && (
                <Box
                  style={{
                    border: "1px solid",
                    borderColor: "var(--color-border-primary)",
                    borderRadius: 3,
                    padding: "1px 6px",
                  }}
                >
                  <Text
                    size="xs"
                    fw={600}
                    tt="uppercase"
                    c="dimmed"
                    style={{ letterSpacing: "0.06em", lineHeight: 1.6 }}
                  >
                    {exchange}
                  </Text>
                </Box>
              )}
              <Group
                gap={8}
                wrap="nowrap"
                style={{
                  border: "1px solid",
                  borderColor: changeColor,
                  borderRadius: 3,
                  padding: "2px 8px",
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
                {change != null && percentChange != null && showChange && (
                  <Text
                    size="sm"
                    fw={600}
                    style={{
                      color: changeColor,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {isUp ? "+" : ""}
                    {change.toFixed(2)} ({isUp ? "+" : ""}
                    {percentChange.toFixed(2)}%)
                  </Text>
                )}
              </Group>
            </Group>
            <Text size="sm" c="dimmed" truncate>
              {displayName}
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
                  warmupData={allBars}
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
