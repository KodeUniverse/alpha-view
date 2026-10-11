import asyncio
import json
import logging
import uuid
from asyncio.queues import Queue, QueueFull
from collections import defaultdict
from typing import Annotated, Any, Literal, NamedTuple, Never, override

from alpaca.data.live.stock import StockDataStream as AlpacaStockDataStream
from alpaca.data.models.bars import Bar
from fastapi import WebSocket, WebSocketDisconnect
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
    FastAPI's lifespan and stash it on app.state). `serve()` is then called
    once per client connecting to the websocket route.

    Each client gets a ClientSession, which will be used to track subscriptions to 
    tickers per-client. Alpaca will produce data for many tickers, and clients will 
    recieve only the tickers they are subscribed to, delivered to their ClientSession outboxes.
    """

    def __init__(self):

        api_key, api_secret = get_alpaca_credentials()

        self.alpaca_data_queue: Queue[LiveBar] = Queue()
        self.stream_client: AlpacaStockDataStream = AlpacaStockDataStream(api_key, api_secret)
        self.registry: defaultdict[SubscribedTicker, set[ClientSession]] = defaultdict(set) 

        self.stream_task: asyncio.Task[None] = asyncio.create_task(asyncio.to_thread(self.stream_client.run))
        self._dispatcher_task: asyncio.Task[Never] = asyncio.create_task(self._dispatcher())

        self._app_loop: asyncio.AbstractEventLoop = asyncio.get_running_loop()

    @classmethod
    async def new(cls) -> "LiveStockDataFeed":
        self = cls()

        return self
    

    async def serve(self, websocket: WebSocket) -> None:
        await websocket.accept()
        
        client_uuid = int(uuid.uuid4()) # collisions possible but practically unlikely at this scale 
        client = ClientSession(id=client_uuid, socket=websocket)
        
        logger.info(f"Client {client.id} connected.")

        async def incoming_handler():
            async for msg in websocket.iter_text():
                try:
                    validated_msg = RecievedMsgAdapter.validate_json(msg)

                    tickers: list[SubscribedTicker] = []
                    if minute_bars := validated_msg.bars:
                        for ticker in minute_bars:
                            tickers.append(SubscribedTicker(ticker, "minute_bar"))

                    if daily_bars := validated_msg.dailyBars:
                        for ticker in daily_bars:
                            tickers.append(SubscribedTicker(ticker, "daily_bar"))

                    if isinstance(validated_msg, SubscribeMsg):
                        
                        for ticker in tickers:
                            self._register_client_sub(session=client, sub=ticker)
                    else:

                        for ticker in tickers:
                            self._register_client_unsub(session=client, unsub=ticker)

                except ValidationError as e:
                    # TODO: return some error to the client
                    logger.info(f"Malformed message recieved to LiveStockDataFeed server: {e}")

        async def outgoing_handler():

            while True:
                
                payload = await client.outbox.get()

                try:
                    await client.socket.send_text(payload)
                except WebSocketDisconnect:
                    logger.info(f"Client {client.id} disconnected.")
                    break

        consumer_task = asyncio.create_task(incoming_handler())
        producer_task = asyncio.create_task(outgoing_handler())
        # when one task completes/stops, the other will also stop. Incoming and outgoing should live and die together.
        done, pending = await asyncio.wait([consumer_task, producer_task], return_when=asyncio.FIRST_COMPLETED)

        for task in pending:
            task.cancel()

    def _register_client_sub(self, session: ClientSession, sub: SubscribedTicker):

        if sub not in self.registry:
            match sub.freq:
                case "daily_bar":
                    self.stream_client.subscribe_daily_bars(self._enqueue_daily_bar, sub.name)
                case "minute_bar":
                    self.stream_client.subscribe_bars(self._enqueue_minute_bar, sub.name)

        self.registry[sub].add(session)
    
    def _register_client_unsub(self, session: ClientSession, unsub: SubscribedTicker):
        
        if unsub in self.registry and session in self.registry[unsub]:
            listeners = self.registry[unsub]
            listeners.remove(session)
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

            bar, bar_kind = await self.alpaca_data_queue.get()
            ticker = SubscribedTicker(bar.symbol, bar_kind)

            if listening_clients := self.registry.get(ticker):
                for client in listening_clients:
                    try:
                        client.outbox.put_nowait(LiveBar(bar, bar_kind).to_json())
                    except QueueFull:
                        logger.info(f"Client {client.id}'s queue is full, closing client session.")
                        # TODO: Don't await here, what if the listening_clients changes from incoming_handler while awaiting here?
                        # Will raise RuntimeError: Set changes size during iteration.
                        await client.socket.close()

    async def _enqueue_minute_bar(self, bar: Bar | dict[Any, Any]) -> None:
        
        if not isinstance(bar, Bar):
            bar = Bar.model_validate(bar)

        self._app_loop.call_soon_threadsafe(self.alpaca_data_queue.put_nowait, LiveBar(bar=bar, freq="minute_bar"))

    async def _enqueue_daily_bar(self, bar: Bar | dict[Any, Any]) -> None:

        if not isinstance(bar, Bar):
            bar = Bar.model_validate(bar)

        self._app_loop.call_soon_threadsafe(self.alpaca_data_queue.put_nowait, LiveBar(bar=bar, freq="daily_bar"))


    async def close(self) -> None:
        await self.stream_client.stop_ws()
        if self.stream_task:
            await self.stream_task
        if self._dispatcher_task:
            await self._dispatcher_task
