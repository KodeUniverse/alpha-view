"""Lifecycle tests for LiveStockDataFeed: lazy stream start, watchdogs, health."""
import asyncio
import inspect
import json
import logging
import threading
from datetime import datetime

import pytest
from alpaca.data.models.bars import Bar

from app.main import app, health_check
from app.providers.alpaca.live import LiveBar, LiveStockDataFeed, SubscribedTicker


class FakeStreamClient:
    """Stands in for AlpacaStockDataStream without touching the network.

    Mirrors the parts of DataStream that matter: subscribe_* records handlers,
    unsubscribe_* does `del` (which raises KeyError if called for a symbol that
    isn't subscribed), and run() spins on a gate until something is registered.
    """

    def __init__(self):
        self._handlers = {"bars": {}, "dailyBars": {}}
        self.subscribed: list[str] = []
        self.unsubscribed: list[str] = []
        # Records _running at each subscribe call. DataStream._subscribe takes a
        # blocking run_coroutine_threadsafe(...).result() path only when this is
        # True, so the first subscribe must see False.
        self.running_at_subscribe: list[bool] = []
        # True once the thread's gate found a handler already registered.
        self.gate_reached = False
        self._running = False
        self._stop = threading.Event()

    @staticmethod
    def _ensure_coroutine(handler):
        assert inspect.iscoroutinefunction(handler), "handler must be a coroutine function"

    def subscribe_bars(self, handler, *symbols):
        self._ensure_coroutine(handler)
        self.running_at_subscribe.append(self._running)
        for s in symbols:
            self._handlers["bars"][s] = handler
        self.subscribed.extend(symbols)

    def subscribe_daily_bars(self, handler, *symbols):
        self._ensure_coroutine(handler)
        self.running_at_subscribe.append(self._running)
        for s in symbols:
            self._handlers["dailyBars"][s] = handler
        self.subscribed.extend(symbols)

    def unsubscribe_bars(self, *symbols):
        for s in symbols:
            del self._handlers["bars"][s]
        self.unsubscribed.extend(symbols)

    def unsubscribe_daily_bars(self, *symbols):
        for s in symbols:
            del self._handlers["dailyBars"][s]
        self.unsubscribed.extend(symbols)

    async def stop_ws(self):
        self._stop.set()

    def run(self):
        """Sync, like the real DataStream.run -- it calls asyncio.run internally.

        The gate mirrors _run_forever: yield without delaying until a handler is
        registered. `asyncio.sleep(0)` is the real hot path that pegs a core,
        so this is also the loop lazy start is meant to avoid entering.

        stop_ws() releases the gate so a thread parked in it can exit. The fake
        returns once the gate opens rather than staying connected: a worker
        thread cannot be interrupted by cancelling its task, so one that stayed
        looped would leak a busy thread per test and stall the suite.
        """
        async def gate():
            while not any(self._handlers.values()):
                if self._stop.is_set():
                    return
                await asyncio.sleep(0)
            self._running = True
            self.gate_reached = True

        asyncio.run(gate())
        self._running = False


@pytest.fixture
async def feed(monkeypatch):
    """A feed on the running loop, with no network dependency."""
    monkeypatch.setattr(
        "app.providers.alpaca.live.get_alpaca_credentials", lambda: ("k", "s")
    )
    monkeypatch.setattr(
        "app.providers.alpaca.live.AlpacaStockDataStream", lambda k, s: FakeStreamClient()
    )
    f = LiveStockDataFeed()
    yield f

    # close() rather than cancelling by hand: cancelling a to_thread task cannot
    # interrupt the worker thread, so stop_ws() is what actually frees it.
    await f.close()
    if f.stream_client._stop.is_set() is False and f.stream_task is not None:
        f.stream_client._stop.set()


async def subscribe(feed, tickers, session=None):
    s = session or feed.new_client(None)
    feed.handle_client_message(
        s, json.dumps({"action": "subscribe", "bars": tickers, "dailyBars": tickers})
    )
    await asyncio.sleep(0)
    return s


def install_feed(feed):
    app.state.live_feed = feed


async def call_health():
    """Invoke the endpoint directly and decode its JSONResponse.

    Avoids TestClient, whose lifespan would reach for real Alpaca credentials
    and spawn a real stream thread.
    """
    resp = await health_check()
    return resp.status_code, json.loads(bytes(resp.body))


# --- Item 1: lazy start -------------------------------------------------


async def test_stream_not_started_before_any_subscription(feed):
    assert feed.stream_task is None, "constructor must not start the Alpaca thread"


async def test_close_without_start_is_safe(feed):
    """close() must tolerate a stream that never started."""
    await feed.close()


async def test_stream_starts_on_first_subscription(feed):
    await subscribe(feed, ["AAPL"])
    assert feed.stream_task is not None, "first subscription must start the stream"
    await feed.stream_task
    assert feed.stream_client.gate_reached is True, (
        "the thread must find a handler already registered -- if it had spun on "
        "the gate with nothing registered, that is the CPU spin lazy start avoids"
    )


async def test_stream_started_exactly_once(feed):
    task = None
    for i in range(5):
        await subscribe(feed, [f"T{i}"])
        if task is None:
            task = feed.stream_task
    assert task is not None
    assert feed.stream_task is task, "must not be replaced on later subscriptions"


async def test_first_subscribe_does_not_block_the_app_loop(feed):
    """_running must be False during the first subscribe.

    That is what makes lazy start safe from the app loop: the real _subscribe
    only takes its blocking run_coroutine_threadsafe(...).result() path when
    _running is True, which would deadlock a single-loop app.
    """
    await subscribe(feed, ["AAPL"])
    # subscribe() sends bars *and* dailyBars, so two calls, both before connect.
    assert feed.stream_client.running_at_subscribe == [False, False]


async def test_subscribe_after_connected_does_not_deadlock(feed):
    """Once _running is True, the real _subscribe blocks on run_coroutine_threadsafe.

    Safe only because the stream owns a separate loop in a separate thread.
    Asserted via running_at_subscribe rather than a real second connection.
    """
    await subscribe(feed, ["AAPL"])
    feed.stream_client._running = True   # simulate a live connection
    await asyncio.wait_for(subscribe(feed, ["MSFT"]), timeout=2.0)
    assert feed.stream_client.running_at_subscribe == [False, False, True, True]


# --- Item 2: watchdogs --------------------------------------------------


async def test_stream_exit_logs_error(feed, caplog):
    """A stream task that ends without _shutting_down must be reported."""
    with caplog.at_level(logging.ERROR):
        # Attach the callback the way _start_stream_if_needed does, so the
        # assertion exercises the real wiring rather than the handler alone.
        feed.stream_task = asyncio.create_task(asyncio.sleep(0))
        feed.stream_task.add_done_callback(feed._on_stream_exit)
        await feed.stream_task
        await asyncio.sleep(0)   # let the done callback run

    assert any("stream thread exited" in r.message.lower() for r in caplog.records)


async def test_start_stream_wires_the_done_callback(feed, caplog):
    """The real path must log when the stream exits, proving the callback is attached."""
    with caplog.at_level(logging.ERROR):
        await subscribe(feed, ["AAPL"])   # starts stream via _start_stream_if_needed
        assert feed.stream_task is not None
        await feed.stream_task             # let it finish
        await asyncio.sleep(0)             # done callback

    assert any("stream thread exited" in r.message.lower() for r in caplog.records)


async def test_clean_shutdown_logs_no_error(feed, caplog):
    """The _shutting_down guard must suppress the error on intentional close."""
    with caplog.at_level(logging.ERROR):
        await subscribe(feed, ["AAPL"])
        await feed.close()
    assert not [r for r in caplog.records if r.levelno >= logging.ERROR]


async def test_dispatcher_cancel_is_not_a_fault(feed, caplog):
    """The dispatcher guards on task.cancelled(), not _shutting_down."""
    with caplog.at_level(logging.ERROR):
        await feed.close()
    assert not [r for r in caplog.records if r.levelno >= logging.ERROR]


async def test_dispatcher_normal_exit_is_a_fault(feed, caplog):
    """Exiting without being cancelled is the unexpected case."""
    with caplog.at_level(logging.ERROR):

        async def die():
            return None

        t = asyncio.create_task(die())
        t.add_done_callback(feed._on_dispatcher_exit)
        await t
        await asyncio.sleep(0)

    assert any("dispatcher task exited" in r.message.lower() for r in caplog.records)


# --- Item 3: health endpoint --------------------------------------------


async def test_health_ok_when_stream_never_started(feed):
    """The subtle case: no stream is the healthy idle state, not a fault."""
    install_feed(feed)
    status, body = await call_health()

    assert status == 200, "idle must not read as degraded"
    assert body["stream"] == "idle"
    assert body["status"] == "ok"


async def test_health_ok_while_running(feed):
    install_feed(feed)
    await subscribe(feed, ["AAPL"])
    status, body = await call_health()

    assert status == 200
    assert body["stream"] == "running"


async def test_health_503_after_stream_dies(feed):
    """The failure this endpoint exists to catch."""
    install_feed(feed)

    async def dead():
        return None

    feed.stream_task = asyncio.create_task(dead())
    await feed.stream_task
    await asyncio.sleep(0)

    status, body = await call_health()
    assert status == 503, "a dead stream must be reported as degraded"
    assert body["stream"] == "exited"
    assert body["status"] == "degraded"


async def test_health_503_after_dispatcher_dies(feed):
    install_feed(feed)
    feed._dispatcher_task.cancel()
    await asyncio.gather(feed._dispatcher_task, return_exceptions=True)

    async def dead():
        return None

    feed._dispatcher_task = asyncio.create_task(dead())
    await feed._dispatcher_task

    status, body = await call_health()
    assert status == 503
    assert body["dispatcher"] == "exited"


async def test_health_reports_tickers_and_sessions(feed):
    install_feed(feed)

    s1, s2, s3 = feed.new_client(None), feed.new_client(None), feed.new_client(None)
    await subscribe(feed, ["AAPL"], s1)
    await subscribe(feed, ["MSFT"], s2)
    await subscribe(feed, ["AAPL"], s3)

    _, body = await call_health()

    # 2 distinct tickers x 2 freqs = 4 buckets; 3 distinct sessions.
    assert body["tickers"] == 4
    assert body["sessions"] == 3


async def test_health_ok_during_shutdown(feed):
    """A health check that fails during normal restarts gets ignored."""
    install_feed(feed)
    await subscribe(feed, ["AAPL"])
    feed._shutting_down = True
    feed._dispatcher_task.cancel()
    await asyncio.gather(feed._dispatcher_task, return_exceptions=True)

    status, _ = await call_health()
    assert status == 200, "shutting down is not degraded"


# --- Refcounting invariants (regression cover) --------------------------


async def test_refcount_prevents_double_unsubscribe(feed):
    """Unsubscribing twice must not reach alpaca again -- it would KeyError."""
    s = feed.new_client(None)
    feed.handle_client_message(s, json.dumps({"action": "subscribe", "bars": ["AAPL"]}))
    feed.handle_client_message(s, json.dumps({"action": "unsubscribe", "bars": ["AAPL"]}))
    feed.handle_client_message(s, json.dumps({"action": "unsubscribe", "bars": ["AAPL"]}))
    feed.release_client(s)
    feed.release_client(s)   # idempotent

    assert feed.stream_client.unsubscribed.count("AAPL") == 1


async def test_second_client_resubscribes_after_bucket_empties(feed):
    """0->1 and 1->0 bucket transitions drive alpaca, not registry key presence."""
    s1, s2 = feed.new_client(None), feed.new_client(None)
    sub = json.dumps({"action": "subscribe", "bars": ["AAPL"]})
    unsub = json.dumps({"action": "unsubscribe", "bars": ["AAPL"]})

    feed.handle_client_message(s1, sub)
    feed.handle_client_message(s2, sub)      # shares the bucket, no upstream call
    feed.handle_client_message(s1, unsub)    # refcount 1, stays subscribed
    feed.handle_client_message(s2, unsub)    # refcount 0, unsubscribes

    # Only one subscribe for the pair; then a clean re-subscribe for whoever comes next.
    assert feed.stream_client.subscribed.count("AAPL") == 1
    assert feed.stream_client.unsubscribed.count("AAPL") == 1

    s3 = feed.new_client(None)
    feed.handle_client_message(s3, sub)
    assert feed.stream_client.subscribed.count("AAPL") == 2, "must re-subscribe after the bucket emptied"


async def test_second_client_in_same_bucket_gets_no_extra_upstream_call(feed):
    s1, s2 = feed.new_client(None), feed.new_client(None)
    msg = json.dumps({"action": "subscribe", "bars": ["AAPL"]})
    feed.handle_client_message(s1, msg)
    feed.handle_client_message(s2, msg)
    assert feed.stream_client.subscribed.count("AAPL") == 1
    assert len(feed.registry) == 1                       # one bucket, both sessions
    assert len(feed.registry[SubscribedTicker("AAPL", "minute_bar")]) == 2


# --- Dispatcher routing -------------------------------------------------


def make_bar(symbol="AAPL"):
    """Construct a Bar the way alpaca-py does: (symbol, raw_data)."""
    raw = {
        "t": datetime(2026, 10, 8, 14, 30),
        "o": 1.0, "h": 2.0, "l": 0.5, "c": 1.5,
        "v": 100, "n": 10, "vw": 1.2,
    }
    return Bar(symbol, raw)


async def test_dispatcher_routes_only_to_subscribers(feed):
    aapl_sess = await subscribe(feed, ["AAPL"])
    other = feed.new_client(None)
    feed.handle_client_message(
        other, json.dumps({"action": "subscribe", "bars": ["MSFT"], "dailyBars": []})
    )

    feed.alpaca_data_queue.put_nowait(LiveBar(bar=make_bar(), freq="minute_bar"))
    await asyncio.sleep(0.05)

    assert not aapl_sess.outbox.empty(), "subscriber should receive the bar"
    assert other.outbox.empty(), "non-subscriber must not"


async def test_dispatcher_survives_a_bad_bar(feed):
    """The dispatcher is the app's single point of failure; it must not die."""
    feed.alpaca_data_queue.put_nowait(object())   # not a LiveBar at all
    await asyncio.sleep(0.05)
    assert not feed._dispatcher_task.done(), "dispatcher survived a malformed item"


async def test_dispatcher_evicts_a_full_client(feed):
    sess = await subscribe(feed, ["AAPL"])
    bar = make_bar()

    for _ in range(sess.outbox.maxsize + 5):
        feed.alpaca_data_queue.put_nowait(LiveBar(bar=bar, freq="minute_bar"))
        await asyncio.sleep(0)

    assert sess.evicted is True
    assert sess.outbox._is_shutdown, "outbox should be shut down, not just full"