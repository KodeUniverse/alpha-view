import asyncio
import json
import logging
import uuid
from asyncio.queues import Queue, QueueFull, QueueShutDown
from collections import defaultdict
from typing import Annotated, Any, Literal, NamedTuple, Never, override

from alpaca.data.live.stock import StockDataStream as AlpacaStockDataStream
from alpaca.data.models.bars import Bar
from fastapi import WebSocket
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

from app.providers.alpaca.auth import get_credentials as get_alpaca_credentials

logger = logging.getLogger(__name__)

class SubscribeMsg(BaseModel):
    action: Literal["subscribe"]
    bars: list[str] | None = None
    dailyBars: list[str] | None = None

class UnsubscribeMsg(BaseModel):
    action: Literal["unsubscribe"]
    bars: list[str] | None = None
    dailyBars: list[str] | None = None
type RecievedMsg = Annotated[SubscribeMsg | UnsubscribeMsg, Field(discriminator="action")]
RecievedMsgAdapter = TypeAdapter(RecievedMsg)

BarKind = Literal["minute_bar", "daily_bar"]

class SubscribedTicker(NamedTuple):
    name: str
    freq: BarKind

class LiveBar(NamedTuple):
    bar: Bar
    freq: BarKind
    
    def to_json(self) -> str:
        return json.dumps({"type": self.freq, "bar": self.bar.model_dump(mode="json")})

class ClientSession:

    def __init__(self, id: int, socket: WebSocket, outbox_size: int = 100):
        self.id: int = id
        self.socket: WebSocket = socket
        self.outbox: Queue[str] = Queue(maxsize=outbox_size)
        self.tickers: set[SubscribedTicker] = set() 
        self.evicted: bool = False
    
    @override
    def __hash__(self):
        return hash(self.id)

    @override
    def __eq__(self, other):

        if not isinstance(other, ClientSession):
            return NotImplemented

        return self.id == other.id


class LiveStockDataFeed:
    """Relays a single Alpaca live-bars stream to multiple WebSocket clients.

    Alpaca only allows one active market-data connection per free account, so one
    instance is meant to live for the app's whole lifetime (create it in
    FastAPI's lifespan and stash it on app.state).

    Scope: this class owns the *upstream* side -- the single Alpaca connection,
    the registry of who wants which ticker, and the dispatcher that fans bars out
    to per-client outboxes. It deliberately does not own any single socket's
    lifecycle (accept, reader/writer tasks, teardown); that belongs to the
    websocket route, which calls `new_client()` and `handle_client_message()`.

    Each client gets a ClientSession, which will be used to track subscriptions to 
    tickers per-client. Alpaca will produce data for many tickers, and clients will 
    recieve only the tickers they are subscribed to, delivered to their ClientSession outboxes.
    """

    def __init__(self):

        api_key, api_secret = get_alpaca_credentials()

        self.alpaca_data_queue: Queue[LiveBar] = Queue()
        self.stream_client: AlpacaStockDataStream = AlpacaStockDataStream(api_key, api_secret)
        self.registry: defaultdict[SubscribedTicker, set[ClientSession]] = defaultdict(set) 

        # Started lazily on the first subscription -- see _start_stream_if_needed.
        self.stream_task: asyncio.Task[None] | None = None
        self._dispatcher_task: asyncio.Task[Never] = asyncio.create_task(self._dispatcher())
        self._dispatcher_task.add_done_callback(self._on_dispatcher_exit)

        self._shutting_down: bool = False

        self._app_loop: asyncio.AbstractEventLoop = asyncio.get_running_loop()

    @classmethod
    async def new(cls) -> "LiveStockDataFeed":
        self = cls()

        return self
    

    def new_client(self, socket: WebSocket) -> ClientSession:
        """Create the per-connection session (socket + outbox) for one client.

        The feed owns session *identity* (id scheme, outbox sizing) but not the
        connection's lifecycle -- accepting, pumping and tearing down a single
        socket is the websocket route's job.
        """
        session = ClientSession(id=int(uuid.uuid4()), socket=socket)
        logger.info(f"Client {session.id} connected.")
        return session

    def _start_stream_if_needed(self) -> None:
        """Start the Alpaca thread on first use, once handlers exist.

        _run_forever() spins on `await asyncio.sleep(0)` -- yielding but never
        delaying -- until something is registered, which pegs a core for as long
        as no client has subscribed. Calling subscribe_bars() first means the
        gate is already open by the time the thread starts.

        Safe to call from the app loop on that first subscription: the thread
        hasn't connected yet, so `_running` is still False and _subscribe()
        skips its blocking run_coroutine_threadsafe(...).result() path.
        """
        if self.stream_task is not None:
            return
        self.stream_task = asyncio.create_task(asyncio.to_thread(self.stream_client.run))
        self.stream_task.add_done_callback(self._on_stream_exit)

    def _on_stream_exit(self, task: asyncio.Task[None]) -> None:
        """The stream thread exited. Nothing restarts it, so this is the only signal."""
        if self._shutting_down:
            return
        logger.error(
            "Alpaca stream thread exited unexpectedly. Live bars will not resume "
            "until this process restarts. exception=%r",
            task.exception() if not task.cancelled() else None,
        )

    def _on_dispatcher_exit(self, task: asyncio.Task[Never]) -> None:
        """The dispatcher ended. Cancelled by close() is expected; anything else is not."""
        if task.cancelled():
            return
        logger.error("Dispatcher task exited unexpectedly; no bars will be delivered.")
    
    def release_client(self, session: ClientSession) -> None:
        """Unwind a session from the registry and release upstream subscriptions.

        Synchronous on purpose: the dispatcher may need to call this directly,
        and it sits inside the fan-out loop where awaiting is not an option.
        Deliberately does not close the socket -- every path that needs a close
        already has one (the client closed it, or the writer task closed it on
        QueueShutDown), and starlette raises if you close a dead socket twice.
        """
        for ticker in list(session.tickers):
            self._register_client_unsub(session, ticker)

        

    def handle_client_message(self, session: ClientSession, raw_msg: str) -> None:
        """Parse one inbound client message and apply it to the registry.

        Deliberately knows nothing about sockets: it takes the session so it can
        attribute the subscription, then mutates registry/alpaca state only.
        """
        try:
            validated_msg = RecievedMsgAdapter.validate_json(raw_msg)
        except ValidationError as e:
            logger.info(f"Malformed message recieved to LiveStockDataFeed server: {e}")
            return

        tickers: list[SubscribedTicker] = []
        if minute_bars := validated_msg.bars:
            tickers.extend(SubscribedTicker(ticker, "minute_bar") for ticker in minute_bars)

        if daily_bars := validated_msg.dailyBars:
            tickers.extend(SubscribedTicker(ticker, "daily_bar") for ticker in daily_bars)

        if isinstance(validated_msg, SubscribeMsg):
            for ticker in tickers:
                self._register_client_sub(session=session, sub=ticker)
        else:
            for ticker in tickers:
                self._register_client_unsub(session=session, unsub=ticker)

    def _register_client_sub(self, session: ClientSession, sub: SubscribedTicker):

        if sub not in self.registry:
            match sub.freq:
                case "daily_bar":
                    self.stream_client.subscribe_daily_bars(self._enqueue_daily_bar, sub.name)
                case "minute_bar":
                    self.stream_client.subscribe_bars(self._enqueue_minute_bar, sub.name)

            # After the subscribe, so _run_forever() finds handlers already registered.
            self._start_stream_if_needed()

        self.registry[sub].add(session)
        session.tickers.add(sub)
    
    def _register_client_unsub(self, session: ClientSession, unsub: SubscribedTicker):
        
        if unsub in self.registry and session in self.registry[unsub]:
            listeners = self.registry[unsub]
            listeners.remove(session)
            session.tickers.remove(unsub)

            ref_ct = len(listeners)

            if ref_ct == 0:

                del self.registry[unsub]

                match unsub.freq:
                    case "daily_bar":
                        self.stream_client.unsubscribe_daily_bars(unsub.name)
                    case "minute_bar":
                        self.stream_client.unsubscribe_bars(unsub.name)

    async def _dispatcher(self):
        
        """Consumes self.alpaca_data_queue and dispatches data into ClientSession outboxes."""

        while True:

            # The dispatcher is a single point of failure: if this task dies, no
            # client gets bars ever again. Everything after `get()` sits inside
            # the guard, including the unpack -- a malformed item must not be
            # able to kill the loop.
            item = await self.alpaca_data_queue.get()

            try:
                bar, bar_kind = item
                ticker = SubscribedTicker(bar.symbol, bar_kind)
                listening_clients = self.registry.get(ticker)

                if listening_clients:
                    payload = LiveBar(bar, bar_kind).to_json()

                    for client in listening_clients:
                        if client.evicted:
                            continue

                        try:
                            client.outbox.put_nowait(payload)
                        except QueueFull:
                            client.evicted = True
                            client.outbox.shutdown(immediate=True)
                            logger.info(f"Client {client.id}'s outbox is full, evicting.")
                        except QueueShutDown:
                            logger.info(f"Client {client.id}'s outbox was written to after shutdown.")
            except Exception:
                logger.exception("Dispatcher failed to route a bar; dropping it.")

    async def _enqueue_minute_bar(self, bar: Bar | dict[Any, Any]) -> None:
        
        if not isinstance(bar, Bar):
            bar = Bar.model_validate(bar)

        self._app_loop.call_soon_threadsafe(self.alpaca_data_queue.put_nowait, LiveBar(bar=bar, freq="minute_bar"))

    async def _enqueue_daily_bar(self, bar: Bar | dict[Any, Any]) -> None:

        if not isinstance(bar, Bar):
            bar = Bar.model_validate(bar)

        self._app_loop.call_soon_threadsafe(self.alpaca_data_queue.put_nowait, LiveBar(bar=bar, freq="daily_bar"))


    async def close(self) -> None:
        """Shut down the dispatcher and the stream thread. Safe to call at any time.

        Tolerates a stream that was never started -- with lazy start, a backend
        that never served a subscribing client has no stream_task at all.
        """
        self._shutting_down = True

        self._dispatcher_task.cancel()
        await asyncio.gather(self._dispatcher_task, return_exceptions=True)

        if self.stream_task is None:
            return

        await self.stream_client.stop_ws()
        await self.stream_task

