# Backend

FastAPI service. Owns all data access: the Alpaca and Finnhub integrations, the
SQLite watchlist store, and the live-bar WebSocket fan-out.

Runs in Docker via `make start` (see the root `AGENTS.md`). Tests run with
`uv run pytest` from this directory.

## Layout

```
app/
  main.py            FastAPI app, lifespan, CORS, /health, /ws/live
  database/          async engine, get_session, SQLAlchemy Core tables
  providers/         everything that talks to a third party
    alpaca/          auth.py, fetches.py (REST), live.py (WebSocket)
    finnhub.py       news and company financials
  routers/           HTTP layer only
  schemas/           Pydantic models shared across layers
tests/               pytest suite
scripts/             manual shell helpers, e.g. websocat auth check
```

## Conventions

- **Everything is type-hinted.** PEP 604 unions (`X | None`), PEP 695 `type` aliases
  (`type NewsCategory = Literal[...]`), builtin generics (`dict[str, list[...]]`).
  `from typing import Any, cast, override` where genuinely needed.
- `snake_case` functions and module-level names, `PascalCase` classes, `_private` for
  module-internal helpers.
- One `logger = logging.getLogger(__name__)` per module. Log with `%s`-style
  lazy formatting or f-strings, both appear in the tree.
- **No ruff, black, or flake8.** The only static config is `[tool.basedpyright]` in
  `pyproject.toml` (`typeCheckingMode = "recommended"`, `reportUnusedParameter =
  "error"`). Match the surrounding style by hand; do not reformat files wholesale.
- Blank line after a module-level `logger`/`router` assignment before the first
  definition is the prevailing rhythm. Keep it.

## Layering

`routers/` → `providers/`. Never the reverse, and routers must not import
`app.database` for anything beyond the injected session.

A router is thin: a module-level `router = APIRouter()`, then one handler with a
typed signature and a typed return. Provider failures become HTTP errors:

```python
@router.get("/news")
async def get_news(category: NewsCategory) -> list[NewsArticle]:
    try:
        return await finnhub.get_market_news(category)
    except Exception as e:
        logger.exception("Failed to fetch news from Finnhub.")
        raise HTTPException(502, f"Failed to fetch news from Finnhub for category {category}.") from e
```

502 for upstream provider failures, 400 for bad input. Always `raise ... from e` and
always `logger.exception` first.

All routers are mounted with `prefix="/api"` in `main.py`. A new router needs a
matching `include_router` line there.

## Database

SQLAlchemy **Core**, not the ORM. Tables are `Table` objects in
`app/database/watchlist.py` with PascalCase column names, FK cascades, and explicit
`UniqueConstraint`s. Queries go through the async engine and return rows consumed
via `result.mappings().one()`, `.one_or_none()`, or `.all()`. Schema creation is
`init_database_schema()` called from the lifespan.

`get_session` is a FastAPI dependency. `app/dependencies.py` is empty and unused;
do not treat it as the convention to follow. The watchlist router pulls `get_session`
directly from `app.database`.

Provider SDKs are synchronous, so every blocking SDK call is wrapped in
`asyncio.to_thread`. Keep that wrapper.

## Live feed architecture

`app/providers/alpaca/live.py` is the most subtle code in the repo. Read it fully
before changing it.

**Why it is shaped this way:** Alpaca's free tier allows exactly one market-data
connection per account. So there is one upstream socket for the whole app, and it
fans out to every connected browser.

**Ownership split.** `LiveStockDataFeed` owns the upstream side only: the Alpaca
connection, the subscription registry, and the dispatcher. It deliberately knows
nothing about any single socket's lifecycle. `new_client()`, `handle_client_message()`
and `release_client()` are the seam. Socket accept, reader/writer pumps, and teardown
belong to the `/ws/live` route in `main.py`.

**The pipeline:**

1. One `LiveStockDataFeed` is created in the FastAPI lifespan and stashed on
   `app.state.live_feed`, so it lives for the process lifetime.
2. The Alpaca stream runs in a worker thread (`asyncio.to_thread`), because
   `StockDataStream.run` blocks.
3. Alpaca's bar callbacks are coroutines that normalize the bar and re-enter the app
   loop with `call_soon_threadsafe`, pushing onto `alpaca_data_queue`.
4. `_dispatcher`, an app-loop task, pops that queue and puts the JSON payload into
   each subscribed client's outbox.
5. Each `ClientSession` owns a `Queue[str]` outbox (maxsize 100) drained by the
   route's outgoing handler.

**Registry.** `registry: defaultdict[SubscribedTicker, set[ClientSession]]`, keyed by
a `NamedTuple` of `(name, freq)` where freq is `minute_bar` or `daily_bar`. Upstream
subscribe and unsubscribe are driven by **0→1 and 1→0 transitions in the listener set**,
not by key presence. Two clients on the same ticker must yield one upstream
subscription.

### Invariants to preserve

- **Subscribe before starting the stream.** `_register_client_sub` calls
  `subscribe_bars`/`subscribe_daily_bars` first and only then
  `_start_stream_if_needed()`. Alpaca's `_run_forever()` busy-waits on
  `sleep(0)` until a handler exists, so starting before subscribing pegs a CPU core.
- **The first subscription must not block.** With that ordering, `_running` is still
  False when the app loop thread calls `subscribe_*`, which skips the blocking
  `run_coroutine_threadsafe(...).result()` path. Reordering deadlocks the first
  client.
- **The dispatcher is a single point of failure.** Everything after
  `alpaca_data_queue.get()`, including the unpack, sits inside `try/except`. One
  malformed bar must not be able to kill the loop.
- **Lookup with `registry.get(...)`, never `registry[...]`.** `registry` is a
  `defaultdict`; a plain subscript in the dispatcher would create an empty bucket on
  every bar for a ticker nobody wants and corrupt the `tickers` count in `/health`.
- **Slow clients are evicted, not awaited.** A full outbox marks the session
  `evicted` and calls `outbox.shutdown(immediate=True)`. The outgoing handler catches
  `QueueShutDown` and closes the socket. Never block the dispatcher on one client.
- **`release_client` is synchronous on purpose.** It can be called from inside the
  fan-out loop where awaiting is not available, and it does not close the socket,
  because starlette raises if a dead socket is closed twice.
- **`close()` must tolerate a never-started stream.** With lazy start, a backend that
  never served a subscribing client has no `stream_task` at all.
- **Watchdogs.** `_on_stream_exit` and `_on_dispatcher_exit` are the only signal that
  a long-lived task died; nothing restarts them. Both must stay quiet when the exit was
  expected (`_shutting_down`, cancelled).

### Health

`GET /health` returns 503 when the stream or dispatcher has died, because that failure
mode is otherwise invisible: the process keeps serving HTTP while delivering no bars.
A stream that never started reports `idle` and is **healthy**. The frontend container
waits on this endpoint, so keep it cheap and dependency-free.

### Client protocol

Inbound JSON is a discriminated union on `action`, parsed with a Pydantic
`TypeAdapter`:

```json
{"action": "subscribe",   "bars": ["AAPL"], "dailyBars": ["AAPL"]}
{"action": "unsubscribe", "bars": ["AAPL"], "dailyBars": []}
```

A malformed message is logged at info level and dropped; it must not disconnect the
client. Outbound payloads are `LiveBar.to_json()`:
`{"type": "minute_bar" | "daily_bar", "bar": {...}}`. The frontend mirrors this in
`frontend/src/types/provider.ts`.

Prefer extending this design over replacing it. If a change seems to require a
second upstream connection, stop and raise it first.

## Schemas

Pydantic models in `app/schemas/` are the wire contract shared with the frontend.
`stock.py` holds the price/financials models; `news.py` holds news. Use `Literal` type
aliases for constrained string unions. When adding or renaming a field, the matching
zod schema in `frontend/src/types/` must change in the same commit.

Router-local request and response models (`WatchlistResponse`,
`WatchlistItemResponse`, etc.) are defined inline in the router file with
`model_config = ConfigDict(from_attributes=True)`. That is intentional; do not move
them into `app/schemas/` unprompted.

## Tests

pytest with pytest-asyncio in `asyncio_mode = auto`, so **no `@pytest.mark.asyncio`
marker**. Async fixtures are plain `async def` fixtures. `pytest.ini` sets
`testpaths = tests` and filters `websockets` deprecation noise plus the
`httpx`/`TestClient` warning.

`tests/test_live_feed_lifecycle.py` is the reference. It defines a `FakeStreamClient`
double and monkeypatches `get_alpaca_credentials` and `AlpacaStockDataStream` **in the
`live` module's namespace** (`monkeypatch.setattr(live, "AlpacaStockDataStream", ...)`),
because `live.py` imports those names directly. It uses `caplog` for log assertions and
invokes handlers directly instead of going through `TestClient`. Follow that pattern
for new tests; sections are separated with `# --- Item N: name ---` banners.

`backend/scripts/test_alpaca_ws_auth.sh` is a manual websockets probe, not part of the
automated suite.

## Local environment

The backend normally only runs inside Docker, where `fastapi dev` provides reload on
port 8080. For local iteration without Docker, `uv sync` then `uv run fastapi dev
app/main.py` works, but env vars must be supplied from the repo-root `.env` by hand
(Docker passes it in via `env_file`).

Stray artifacts live in this directory and are not source: `alphaview.db`,
`alphadb.sqlite`, `tsconfig.tsbuildinfo`, `dist/`. Ignore them.