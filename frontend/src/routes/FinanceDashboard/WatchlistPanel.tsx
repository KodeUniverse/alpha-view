import {
  Card,
  Text,
  Group,
  Stack,
  ActionIcon,
  Autocomplete,
  Loader,
  Tabs,
  CloseIcon,
  CloseButton,
  Menu,
  Button,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCaretDownFilled,
  IconEdit,
  IconPlaylistAdd,
  IconPlaylistX,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import StockChart from "@/components/StockChart.jsx";
import { useState, useMemo } from "react";
import {
  OHLCVData,
  PriceData,
  Ticker,
  LiveTickerFeedMessage,
  WatchList,
} from "@/types";
import {
  useWatchlist,
  useAddToWatchList,
  useRemoveFromWatchList,
  useSymbolList,
  useBarsBySymbol,
  useGetWatchLists,
} from "@/hooks/queries";
import { useLiveTickerFeed } from "@/hooks/useLiveTickerFeed";
import { watch } from "node:fs";

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

function WatchListSelectButton(props) {
  return (
    <UnstyledButton {...props}>
      <Group
        className="watchlist-select-button"
        style={{
          borderRadius: 5,
          display: "flex",
          alignItems: "center",
          padding: 5,
          gap: 2,
        }}
      >
        <Text fw={"bold"} size="lg" mr="auto">
          Watchlists
        </Text>
        <IconCaretDownFilled size={12} />
      </Group>
    </UnstyledButton>
  );
}
function WatchListSelectMenu({ watchLists }: { watchLists: WatchList[] }) {
  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <WatchListSelectButton />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Lists</Menu.Label>
        <Menu.RadioGroup>
          {watchLists.map((watchlist) => {
            return (
              <Menu.RadioItem key={watchlist.id}>
                {watchlist.listName}
              </Menu.RadioItem>
            );
          })}
        </Menu.RadioGroup>
        <Menu.Divider />
        <Menu.Label>Options</Menu.Label>
        <Menu.Item leftSection={<IconPlus size={20} />}>
          Create new watchlist
        </Menu.Item>
        <Menu.Item leftSection={<IconEdit size={20} />}>
          Rename watchlist
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash size={20} />} color="red">
          Delete watchlist
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  const { data, isLoading, isError, error, isSuccess } = useGetWatchLists();
  console.log(JSON.stringify(data));
  console.log(error);
  return (
    <Card style={{ ...cardStyles, display: "flex", alignItems: "center" }}>
      <Group display={"flex"} w="100%" align="center">
        <WatchListSelectMenu watchLists={data ?? []} />
      </Group>
      {isLoading && !isError && (
        <Group display="flex" justify="center" align="center">
          <Loader />
          <Text>Loading Watchlists...</Text>)
        </Group>
      )}
      {isSuccess && data.length === 0 && (
        <Text>No Watchlists. Create one!</Text>
      )}
      {isSuccess && data.length > 0 && (
        <Text fw={"bold"} size="lg" mb="md">
          Watchlist: {data[0].listName}
        </Text>
      )}
    </Card>
  );
  // const { data: watchlist, isLoading } = useWatchlist();
  // const { mutate: addTicker } = useAddToWatchlist();
  // const { data: symbols } = useSymbolList();
  // const [input, setInput] = useState("");
  // const liveTickers = useLiveTickerFeed(watchlist ?? []);
  // const symbolMap = useMemo(() => {
  //   const map = new Map<string, Ticker>();
  //   for (const t of symbols ?? []) map.set(t.symbol, t);
  //   return map;
  // }, [symbols]);
  // const { start, end } = useMarketSession();
  // const { data: intradayBars, isLoading: intradayLoading } = useBarsBySymbol(
  //   watchlist ?? [],
  //   "intraday",
  //   start,
  //   end,
  // );
  // const dailyStart = useMemo(() => {
  //   const d = new Date();
  //   d.setDate(d.getDate() - 10);
  //   return d;
  // }, []);
  // // Memoized, not inline `new Date()` -- an unstable value here would
  // // change the query key (and refetch) on every live-tick re-render.
  // const dailyEnd = useMemo(() => new Date(), []);
  // const { data: dailyBars } = useBarsBySymbol(
  //   watchlist ?? [],
  //   "daily",
  //   dailyStart,
  //   dailyEnd,
  // );
  // function handleAdd(symbol: string) {
  //   const cleaned = symbol.trim().toUpperCase();
  //   if (!cleaned) return;
  //   const ticker = symbolMap.get(cleaned);
  //   addTicker({ symbol: cleaned, name: ticker?.name ?? cleaned });
  //   setInput("");
  // }
  // const symbolsData = (symbols ?? [])
  //   .map((t) => t.symbol)
  //   .filter((s) => !(watchlist ?? []).some((w) => w.symbol === s));
  // return (
  //   <Card style={{ ...cardStyles, display: "flex", flexDirection: "column" }}>
  //     <Group justify="space-between" align="center" mb={8}>
  //       <Text fw={700} size="lg">
  //         Watchlist
  //       </Text>
  //       {isLoading && <Loader size="xs" />}
  //     </Group>
  //     <Autocomplete
  //       placeholder="Add ticker..."
  //       data={symbolsData}
  //       value={input}
  //       onChange={setInput}
  //       onOptionSubmit={handleAdd}
  //       onKeyDown={(e) => {
  //         if (e.key === "Enter") handleAdd(input);
  //       }}
  //       limit={8}
  //       size="xs"
  //       mb={10}
  //       rightSectionPointerEvents="all"
  //       rightSection={
  //         <ActionIcon
  //           size="sm"
  //           variant="subtle"
  //           aria-label="Add to watchlist"
  //           onClick={() => handleAdd(input)}
  //         >
  //           <IconPlus size={14} />
  //         </ActionIcon>
  //       }
  //     />
  //     <Stack style={{ flex: 1, overflowY: "auto", gap: 8 }}>
  //       {watchlist && watchlist.length > 0 ? (
  //         watchlist.map((ticker) => (
  //           <WatchListItem
  //             key={ticker.symbol}
  //             ticker={ticker}
  //             liveMessage={liveTickers[ticker.symbol]}
  //             intradayBars={intradayBars?.[ticker.symbol] ?? []}
  //             prevClose={computePrevClose(dailyBars?.[ticker.symbol])}
  //           />
  //         ))
  //       ) : (
  //         <Text size="sm" c="dimmed" ta="center" mt="lg">
  //           No tickers yet.
  //           <br />
  //           Search above to add one.
  //         </Text>
  //       )}
  //       {!isLoading && watchlist && watchlist.length > 0 && intradayLoading && (
  //         <Loader size="sm" mx="auto" />
  //       )}
  //     </Stack>
  //   </Card>
  // );
}

function computePrevClose(
  dailyBars: OHLCVData[] | undefined,
): number | undefined {
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
    liveMessage?.minuteBar?.close ??
    (priceData.length > 0 ? priceData[priceData.length - 1].value : undefined);

  const percentChange =
    lastPrice != null && prevClose != null
      ? ((lastPrice - prevClose) / prevClose) * 100
      : undefined;

  const up = percentChange != null && percentChange >= 0;
  const changeColor =
    percentChange == null
      ? "var(--color-text-secondary)"
      : up
        ? "#26a69a"
        : "#ef5350";

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
          {percentChange != null
            ? `${up ? "+" : ""}${percentChange.toFixed(2)}%`
            : "—"}
        </Text>
      </Group>
    </Card>
  );
}

export default WatchListCard;
