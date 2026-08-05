import {
  Card,
  Text,
  Group,
  Stack,
  ActionIcon,
  Autocomplete,
  Loader,
} from "@mantine/core";
import { IconPlus, IconX } from "@tabler/icons-react";
import StockChart from "@/components/StockChart.jsx";
import { useState, useMemo } from "react";
import { OHLCVData, PriceData, Ticker, LiveTickerFeedMessage } from "@shared/types";
import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useSymbolList,
  useBarsBySymbol,
} from "@/hooks/queries";
import { useLiveTickerFeed } from "@/hooks/useLiveTickerFeed";

interface WatchListCardProps {
  cardStyles?: React.CSSProperties;
}

function useMarketSession() {
  return useMemo(() => {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      9,
      30,
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      16,
      0,
    );
    return { start, end };
  }, []);
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  const { data: watchlist, isLoading } = useWatchlist();
  const { mutate: addTicker } = useAddToWatchlist();
  const { data: symbols } = useSymbolList();
  const [input, setInput] = useState("");

  const liveTickers = useLiveTickerFeed(watchlist ?? []);

  const symbolMap = useMemo(() => {
    const map = new Map<string, Ticker>();
    for (const t of symbols ?? []) map.set(t.symbol, t);
    return map;
  }, [symbols]);

  const { start, end } = useMarketSession();

  const { data: intradayBars, isLoading: intradayLoading } = useBarsBySymbol(
    watchlist ?? [],
    "intraday",
    start,
    end,
  );
  const dailyStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d;
  }, []);
  // Pin "now" once per mount instead of passing `new Date()` inline -- the
  // live ticker feed re-renders this component on every tick, and an
  // ever-changing `end` value would change the query key on every render,
  // busting the cache and re-hitting Alpaca's REST API on every tick.
  const dailyEnd = useMemo(() => new Date(), []);
  const { data: dailyBars } = useBarsBySymbol(
    watchlist ?? [],
    "daily",
    dailyStart,
    dailyEnd,
  );

  function handleAdd(symbol: string) {
    const cleaned = symbol.trim().toUpperCase();
    if (!cleaned) return;
    const ticker = symbolMap.get(cleaned);
    addTicker({ symbol: cleaned, name: ticker?.name ?? cleaned });
    setInput("");
  }

  const symbolsData = (symbols ?? [])
    .map((t) => t.symbol)
    .filter((s) => !(watchlist ?? []).some((w) => w.symbol === s));

  return (
    <Card style={{ ...cardStyles, display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" align="center" mb={8}>
        <Text fw={700} size="lg">
          Watchlist
        </Text>
        {isLoading && <Loader size="xs" />}
      </Group>
      <Autocomplete
        placeholder="Add ticker..."
        data={symbolsData}
        value={input}
        onChange={setInput}
        onOptionSubmit={handleAdd}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd(input);
        }}
        limit={8}
        size="xs"
        mb={10}
        rightSectionPointerEvents="all"
        rightSection={
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label="Add to watchlist"
            onClick={() => handleAdd(input)}
          >
            <IconPlus size={14} />
          </ActionIcon>
        }
      />
      <Stack style={{ flex: 1, overflowY: "auto", gap: 8 }}>
        {watchlist && watchlist.length > 0 ? (
          watchlist.map((ticker) => (
            <WatchListItem
              key={ticker.symbol}
              ticker={ticker}
              liveMessage={liveTickers[ticker.symbol]}
              intradayBars={intradayBars?.[ticker.symbol] ?? []}
              prevClose={computePrevClose(dailyBars?.[ticker.symbol])}
            />
          ))
        ) : (
          <Text size="sm" c="dimmed" ta="center" mt="lg">
            No tickers yet.
            <br />
            Search above to add one.
          </Text>
        )}
        {!isLoading && watchlist && watchlist.length > 0 && intradayLoading && (
          <Loader size="sm" mx="auto" />
        )}
      </Stack>
    </Card>
  );
}

function computePrevClose(dailyBars: OHLCVData[] | undefined): number | undefined {
  if (!dailyBars || dailyBars.length === 0) return undefined;
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const prior = dailyBars.filter((bar) => bar.time < startOfToday);
  if (prior.length === 0) return undefined;
  return prior[prior.length - 1].close;
}

interface WatchListItemProps {
  ticker: Ticker;
  liveMessage: LiveTickerFeedMessage | undefined;
  intradayBars: OHLCVData[];
  prevClose: number | undefined;
}

function WatchListItem({
  ticker,
  liveMessage,
  intradayBars,
  prevClose,
}: WatchListItemProps) {
  const { mutate: removeTicker } = useRemoveFromWatchlist();

  const priceData: PriceData[] = intradayBars.map((bar) => ({
    value: bar.close,
    time: bar.time,
  }));

  const lastPrice =
    liveMessage?.minuteBar?.close ?? (priceData.length > 0 ? priceData[priceData.length - 1].value : undefined);

  const percentChange =
    lastPrice != null && prevClose != null
      ? ((lastPrice - prevClose) / prevClose) * 100
      : undefined;

  const up = percentChange != null && percentChange >= 0;
  const changeColor = percentChange == null ? "var(--color-text-secondary)" : up ? "#26a69a" : "#ef5350";

  return (
    <Card
      style={{
        padding: 8,
        border: "1px solid var(--color-background-tertiary)",
        flexShrink: 0,
      }}
    >
      <Group justify="space-between" align="start" wrap="nowrap" mb={2}>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text fw={700} size="sm" truncate>
            {ticker.symbol}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {ticker.name ?? ticker.symbol}
          </Text>
        </Stack>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="gray"
          aria-label={`Remove ${ticker.symbol} from watchlist`}
          onClick={() => removeTicker(ticker.symbol)}
        >
          <IconX size={12} />
        </ActionIcon>
      </Group>
      <StockChart
        priceData={priceData}
        chartType="area"
        latestTick={liveMessage}
        frequency="intraday"
        containerStyles={{ width: "100%", height: 40 }}
        showHorizAxis={false}
        showVertAxis={false}
        interactive={false}
        showGrid={false}
      />
      <Group justify="space-between" align="center" wrap="nowrap">
        <Text size="sm" fw={700} style={{ fontVariantNumeric: "tabular-nums" }}>
          {lastPrice != null ? `$${lastPrice.toFixed(2)}` : "—"}
        </Text>
        <Text
          size="xs"
          fw={600}
          style={{
            color: changeColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {percentChange != null ? `${up ? "+" : ""}${percentChange.toFixed(2)}%` : "—"}
        </Text>
      </Group>
    </Card>
  );
}

export default WatchListCard;
