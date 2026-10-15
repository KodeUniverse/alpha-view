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
  IconCheck,
  IconEdit,
  IconPlaylistAdd,
  IconPlaylistX,
  IconPlus,
  IconSearch,
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
  WatchListTicker,
} from "@/types";
import {
  useAddToWatchList,
  useRemoveFromWatchList,
  useSymbolList,
  useBarsBySymbol,
  useGetWatchLists,
  useGetWatchListItems,
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
function WatchListSelectMenu({
  watchLists,
  selectedListId,
  onSelect,
}: {
  watchLists: WatchList[];
  selectedListId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <Menu shadow="md" width={200} checkIcon={<IconCheck size={12} />}>
      <Menu.Target>
        <WatchListSelectButton />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Lists</Menu.Label>
        <Menu.RadioGroup
          value={selectedListId === null ? null : String(selectedListId)}
          onChange={(value) => onSelect(Number(value))}
        >
          {watchLists.map((watchlist) => {
            return (
              <Menu.RadioItem
                key={watchlist.id}
                value={watchlist.id.toString()}
              >
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

const ADD_TICKER_RESULT_LIMIT = 15;

function AddTickerMenu({
  listId,
  existingSymbols,
  onAdd,
}: {
  listId: number | null;
  existingSymbols: string[];
  onAdd: (ticker: Ticker) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: symbols } = useSymbolList();

  const taken = useMemo(() => new Set(existingSymbols), [existingSymbols]);

  // /api/symbols returns every active US equity, so results only appear once the
  // user has typed something and the list is capped.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !symbols) return [];
    return symbols
      .filter(
        (symbol) =>
          !taken.has(symbol.symbol) &&
          (symbol.symbol.toLowerCase().includes(q) ||
            (symbol.name ?? "").toLowerCase().includes(q)),
      )
      .slice(0, ADD_TICKER_RESULT_LIMIT);
  }, [query, symbols, taken]);

  return (
    <Menu shadow="md" width={260} disabled={listId === null}>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Add ticker to watchlist"
          disabled={listId === null}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Search
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tickers"
          leftSection={<IconSearch size={14} />}
        />
        <Menu.Divider />
        {results.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xs">
            {query.trim() ? "No matching tickers." : "Type to search."}
          </Text>
        ) : (
          results.map((symbol) => (
            <Menu.Item key={symbol.symbol} onClick={() => onAdd(symbol)}>
              <Stack gap={0}>
                <Text size="sm" fw={600}>
                  {symbol.symbol}
                </Text>
                <Text size="xs" c="dimmed">
                  {symbol.name ?? "—"}
                </Text>
              </Stack>
            </Menu.Item>
          ))
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

function WatchListCard({ cardStyles }: WatchListCardProps) {
  const {
    data: watchlists,
    isLoading,
    isError,
    error,
    isSuccess,
  } = useGetWatchLists();

  // Only the user's choice lives in state. `selectedList` is re-derived on every
  // render from the current query data, so a list that was renamed or deleted
  // underneath us can never leave a stale copy behind. And we fall back to the
  // first list so there is always something selected while any list exists.
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const selectedList =
    watchlists?.find((list) => list.id === selectedListId) ??
    watchlists?.[0] ??
    null;
  const {
    data: listItems,
    isSuccess: itemsSuccess,
    isLoading: itemsLoading,
    isError: itemsIsError,
    error: itemsError,
  } = useGetWatchListItems(selectedList?.id ?? null);

  // One Ticker[] feeds the live feed and both bar queries. Kept memoized so the
  // subscription effect (which stringifies symbols) doesn't churn on every render.
  const tickers = useMemo<Ticker[]>(
    () =>
      (listItems ?? []).map((item) => ({
        symbol: item.ticker,
        name: item.name,
      })),
    [listItems],
  );

  const { start, end } = useMarketSession();
  const dailyStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d;
  }, []);
  const dailyEnd = useMemo(() => new Date(), []);

  // Hooks stay unconditional and are batched at the card level: one WebSocket
  // subscription and one request per frequency, instead of one of each per row.
  const liveMessages = useLiveTickerFeed(tickers);
  const { data: intradayBars } = useBarsBySymbol(
    tickers,
    "intraday",
    start,
    end,
  );
  const { data: dailyBars } = useBarsBySymbol(
    tickers,
    "daily",
    dailyStart,
    dailyEnd,
  );

  const { mutate: addTicker } = useAddToWatchList();
  const [addError, setAddError] = useState<string | null>(null);

  const existingSymbols = useMemo(
    () => (listItems ?? []).map((item) => item.ticker),
    [listItems],
  );

  function handleAdd(symbol: Ticker) {
    if (!selectedList) return;
    setAddError(null);
    addTicker(
      { ticker: symbol, listId: selectedList.id },
      { onError: (err) => setAddError((err as Error).message) },
    );
  }

  return (
    <Card style={{ ...cardStyles, display: "flex", alignItems: "center" }}>
      <Group
        display="flex"
        w="100%"
        align="center"
        justify="space-between"
      >
        <WatchListSelectMenu
          watchLists={watchlists ?? []}
          selectedListId={selectedList?.id ?? null}
          onSelect={setSelectedListId}
        />
        <AddTickerMenu
          listId={selectedList?.id ?? null}
          existingSymbols={existingSymbols}
          onAdd={handleAdd}
        />
      </Group>
      {addError && (
        <Text size="sm" c="red" mt="xs">
          Could not add ticker: {addError}
        </Text>
      )}
      {isLoading && !isError && (
        <Group display="flex" justify="center" align="center">
          <Loader />
          <Text>Loading watchlists...</Text>
        </Group>
      )}
      {isSuccess && watchlists.length === 0 && (
        <Text>No watchlists. Create one!</Text>
      )}
      {isError && !isLoading && error && (
        <Stack>
          <Text>Could not load watchlists.</Text>
          <Text>{error.message}</Text>
        </Stack>
      )}
      {selectedList && itemsLoading && !itemsIsError && (
        <Group display="flex" justify="center" align="center">
          <Loader />
          <Text>Loading watchlist items...</Text>
        </Group>
      )}
      {selectedList && itemsIsError && itemsError && (
        <Stack>
          <Text>Could not load watchlist items.</Text>
          <Text>{itemsError.message}</Text>
        </Stack>
      )}
      {selectedList && itemsSuccess && listItems?.length !== 0 && (
        <Stack
          style={{ flex: 1, overflowY: "auto", gap: 8, width: "90%" }}
          mt="xs"
        >
          {listItems.map((item: WatchListTicker) => (
            <WatchListItem
              key={item.id}
              ticker={{ symbol: item.ticker, name: item.name ?? item.ticker }}
              listId={item.listId}
              liveMessage={liveMessages[item.ticker]}
              intradayBars={intradayBars?.[item.ticker] ?? []}
              prevClose={computePrevClose(dailyBars?.[item.ticker])}
            />
          ))}
        </Stack>
      )}
      {selectedList && itemsSuccess && listItems?.length === 0 && (
        <Text>This watchlist is empty. Add a ticker.</Text>
      )}
    </Card>
  );
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

function isSameTradingDay(time: Date, reference: Date): boolean {
  return (
    time.getFullYear() === reference.getFullYear() &&
    time.getMonth() === reference.getMonth() &&
    time.getDate() === reference.getDate()
  );
}

interface WatchListItemProps {
  ticker: Ticker;
  liveMessage: LiveTickerFeedMessage | undefined;
  intradayBars: OHLCVData[];
  prevClose: number | undefined;
  listId: number;
}

function WatchListItem({
  ticker,
  liveMessage,
  intradayBars,
  prevClose,
  listId,
}: WatchListItemProps) {
  const { mutate: removeTicker } = useRemoveFromWatchList();

  // The mini chart is scoped to the current trading day. The query already asks
  // the server for today only, but clamping here also stops a live tick from
  // outside the window (premarket, a stale replay) from stretching the x-axis,
  // since StockChart.update() expands the visible range to fit whatever it gets.
  const today = new Date();

  const priceData: PriceData[] = intradayBars
    .filter((bar) => isSameTradingDay(bar.time, today))
    .map((bar) => ({
      value: bar.close,
      time: bar.time,
    }));

  const todayLiveMessage: LiveTickerFeedMessage | undefined = liveMessage && {
    dailyBar:
      liveMessage.dailyBar && isSameTradingDay(liveMessage.dailyBar.time, today)
        ? liveMessage.dailyBar
        : null,
    minuteBar:
      liveMessage.minuteBar &&
      isSameTradingDay(liveMessage.minuteBar.time, today)
        ? liveMessage.minuteBar
        : null,
  };

  const lastPrice =
    todayLiveMessage?.minuteBar?.close ??
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
          onClick={() => removeTicker({ ticker, listId })}
        >
          <IconX size={12} />
        </ActionIcon>
      </Group>
      <StockChart
        priceData={priceData}
        chartType="area"
        latestTick={todayLiveMessage}
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
