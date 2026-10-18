import {
  Card,
  Text,
  Group,
  Stack,
  ActionIcon,
  Loader,
  Menu,
  Button,
  UnstyledButton,
  Modal,
  Input,
  Select,
} from "@mantine/core";
import {
  IconCaretDownFilled,
  IconCheck,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import StockChart from "@/components/StockChart.jsx";
import { useState, useMemo, useRef, useCallback } from "react";
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
  useCreateWatchList,
  useDeleteWatchList,
  useRenameWatchList,
} from "@/hooks/queries";
import { useLiveTickerFeed } from "@/hooks/useLiveTickerFeed";
import { CHART_COLOR_TOKENS } from "@/utils/colors";
import { isSameTradingDay } from "@/utils/dates";
import { useDisclosure } from "@mantine/hooks";

interface WatchListCardProps {
  cardStyles?: React.CSSProperties;
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

function CreateWatchListModal({
  opened,
  closeHandler,
}: {
  opened: boolean;
  closeHandler: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: createList } = useCreateWatchList();

  const createListHandler = () => {
    createList({ listName: inputRef.current.value });
    closeHandler();
  };
  return (
    <Modal
      opened={opened}
      onClose={closeHandler}
      title="Create watchlist"
      centered
    >
      <Stack gap={1}>
        <Input.Wrapper label="List name">
          <Input placeholder={"Stocks"} ref={inputRef} />
        </Input.Wrapper>
      </Stack>
      <Stack mt={20}>
        <Button ml="auto" variant="filled" onClick={createListHandler}>
          Create
        </Button>
      </Stack>
    </Modal>
  );
}

function DeleteWatchListModal({
  opened,
  closeHandler,
  watchlists,
}: {
  opened: boolean;
  closeHandler: () => void;
  watchlists: WatchList[];
}) {
  const [listName, setListName] = useState<string>(null);
  const { mutate: deleteList } = useDeleteWatchList();

  const deleteListHandler = useCallback(() => {
    const listId = watchlists.find((list) => {
      return list.listName === listName;
    })?.id;
    if (listId) {
      deleteList({ listId });
      closeHandler();
    }
  }, [listName]);

  return (
    <Modal
      opened={opened}
      onClose={closeHandler}
      title="Delete watchlist"
      centered
    >
      <Stack>
        <Select
          label="Watchlists"
          data={watchlists.map((list) => {
            return list.listName;
          })}
          value={listName}
          onChange={(value) => setListName(value)}
        />
        <Button ml="auto" onClick={deleteListHandler}>
          Delete
        </Button>
      </Stack>
    </Modal>
  );
}

function RenameWatchListModal({
  opened,
  closeHandler,
  watchlists,
}: {
  opened: boolean;
  closeHandler: () => void;
  watchlists: WatchList[];
}) {
  const [listName, setListName] = useState<string>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: renameList } = useRenameWatchList();

  const renameListHandler = useCallback(() => {
    const listId = watchlists.find((list) => {
      return list.listName === listName;
    })?.id;
    if (listId) {
      renameList({ listId, listName: inputRef.current.value });
      closeHandler();
    }
  }, [listName]);

  return (
    <Modal
      opened={opened}
      onClose={closeHandler}
      title="Rename watchlist"
      centered
    >
      <Stack>
        <Select
          label="Watchlists"
          data={watchlists.map((list) => {
            return list.listName;
          })}
          value={listName}
          onChange={(value) => setListName(value)}
        />
        <Input.Wrapper label="New name">
          <Input placeholder={"Stocks"} ref={inputRef} />
        </Input.Wrapper>
        <Button ml="auto" onClick={renameListHandler}>
          Rename
        </Button>
      </Stack>
    </Modal>
  );
}

function WatchListSelectMenu({
  watchlists,
  selectedListId,
  onSelect,
}: {
  watchlists: WatchList[];
  selectedListId: number | null;
  onSelect: (id: number) => void;
}) {
  const [createListOpened, { open: createListOpen, close: createListClose }] =
    useDisclosure(false);
  const [deleteListOpened, { open: deleteListOpen, close: deleteListClose }] =
    useDisclosure(false);
  const [renameListOpened, { open: renameListOpen, close: renameListClose }] =
    useDisclosure(false);
  return (
    <>
      {/**Modals**/}
      <CreateWatchListModal
        opened={createListOpened}
        closeHandler={createListClose}
      />
      <RenameWatchListModal
        opened={renameListOpened}
        closeHandler={renameListClose}
        watchlists={watchlists}
      />
      <DeleteWatchListModal
        opened={deleteListOpened}
        closeHandler={deleteListClose}
        watchlists={watchlists}
      />
      {/**Select Menu**/}
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
            {watchlists?.map((watchlist) => {
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
          <Menu.Item
            leftSection={<IconPlus size={20} />}
            onClick={createListOpen}
          >
            Create new watchlist
          </Menu.Item>
          <Menu.Item
            leftSection={<IconEdit size={20} />}
            onClick={renameListOpen}
          >
            Rename watchlist
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTrash size={20} />}
            color="red"
            onClick={deleteListOpen}
          >
            Delete watchlist
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
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

  // track already watchlisted symbols to avoid showing.
  const taken = useMemo(() => new Set(existingSymbols), [existingSymbols]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !symbols) return [];
    return symbols
      .filter(
        (ticker) =>
          !taken.has(ticker.symbol) &&
          (ticker.symbol.toLowerCase().includes(q) ||
            (ticker.name ?? "").toLowerCase().includes(q)),
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

  // Ask for a generous intraday window rather than exactly today's session. A
  // window of "today 09:30-16:00" returns nothing at all outside trading hours --
  // before the open, after the close, overnight, or across a weekend/holiday --
  // which leaves the mini charts blank. With a lookback, the newest-session anchor
  // inside WatchListItem selects whichever session actually has data.
  // Memoized: useBarsBySymbol keys on start/end .getTime(), so an inline
  // `new Date()` would refetch on every live tick.
  const intradayWindow = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return { start, end };
  }, []);

  // this dailyStart and dailyEnd are fed to computePrevClose to compute % chg from
  // the last trading day close. It looks thru the last 10 days to find the most recent last close.
  const dailyStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d;
  }, []);
  const dailyEnd = useMemo(() => new Date(), []);

  // a live feed subscription and a historical
  const liveMessages = useLiveTickerFeed(tickers);
  const { data: intradayBars } = useBarsBySymbol(
    tickers,
    "intraday",
    intradayWindow.start,
    intradayWindow.end,
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
      <Group display="flex" w="100%" align="center" justify="space-between">
        <WatchListSelectMenu
          watchlists={watchlists ?? []}
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

  // The mini chart shows ONE trading session -- never a mix of two on one axis,
  // and never a stray out-of-window tick stretching the range (StockChart.update()
  // expands the visible range to fit whatever it is handed).
  //
  // The anchor is the newest timestamp we actually hold, NOT `new Date()`.
  // Anchoring to the clock blanked the chart whenever the fetched window didn't
  // line up with the current day. Anchoring to the data means today during the
  // session, the last session overnight, and the last session across weekends and
  // holidays -- with no timer and no trading calendar involved.
  const anchor = useMemo(() => {
    const newestBar = intradayBars.reduce<Date | null>(
      (newest, bar) =>
        newest === null || bar.time > newest ? bar.time : newest,
      null,
    );
    const candidates = [newestBar, liveMessage?.minuteBar.time ?? null].filter(
      (d): d is Date => d !== null,
    );
    return candidates.reduce<Date>(
      (newest, d) => (d > newest ? d : newest),
      new Date(0),
    );
  }, [intradayBars, liveMessage]);

  const priceData: PriceData[] = intradayBars
    .filter((bar) => isSameTradingDay(bar.time, anchor))
    .map((bar) => ({
      value: bar.close,
      time: bar.time,
    }));

  const todayLiveMessage: LiveTickerFeedMessage | undefined = liveMessage && {
    dailyBar:
      liveMessage.dailyBar &&
      isSameTradingDay(liveMessage.dailyBar.time, anchor)
        ? liveMessage.dailyBar
        : null,
    minuteBar:
      liveMessage.minuteBar &&
      isSameTradingDay(liveMessage.minuteBar.time, anchor)
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
  // A var() reference rather than a resolved token: this only ever reaches a style prop,
  // which the browser resolves on its own.
  const changeColor =
    percentChange == null
      ? "var(--color-text-secondary)"
      : up
        ? `var(${CHART_COLOR_TOKENS.up})`
        : `var(${CHART_COLOR_TOKENS.down})`;

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
