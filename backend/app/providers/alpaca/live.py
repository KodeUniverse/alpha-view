import asyncio
import json
import logging
import uuid
from asyncio.queues import Queue
from collections import defaultdict
from typing import Annotated, Literal, NamedTuple, override

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

class BarEnvelope(BaseModel):
    type: BarKind
    bar: Bar

class ErrorEnvelope(BaseModel):
    type: Literal["error"] = "error"
    message: str

class SubscribedTicker(NamedTuple):
    name: str
    freq: BarKind


class ClientSession:

    def __init__(self, id: int, socket: WebSocket):
        self.id: int = id
        self.socket: WebSocket = socket
        self.outbox: Queue[Bar] = Queue()
    
    @override
    def __hash__(self):
        return hash(self.id)

    @override
    def __eq__(self, other):

        if not isinstance(other, ClientSession):
            return NotImplemented

        return self.id == other.id

class LiveStockDataFeed:
    """Relays a single Alpaca live-bars stream to FastAPI WebSocket clients.

    Alpaca only allows one active market-data connection per account, so one
    instance is meant to live for the app's whole lifetime (create it in
    FastAPI's lifespan and stash it on app.state). `serve()` is then called
    once per client connecting to the websocket route; every connected
    client shares the same upstream stream and subscription set.
    """

    def __init__(self):

        api_key, api_secret = get_alpaca_credentials()

        self.alpaca_data_queue: Queue[Bar] = Queue()
        self.stream_client: AlpacaStockDataStream = AlpacaStockDataStream(api_key, api_secret)
        self.registry: defaultdict[SubscribedTicker, set[ClientSession]] = defaultdict(set) 

        self._stream_task: asyncio.Task[None] | None = None

    @classmethod
    async def new(cls) -> "LiveStockDataFeed":
        self = cls()

        # alpaca-py only exposes a blocking run(). _run_forever() is its non-blocking coroutine.
        # This won't work because _run_forever has sync calls inside it. this task needs its own thread.
        # The thread will gete data from alpaca and push it to alpaca queue in a thread-safe manner.
         
        self._stream_task = asyncio.create_task(self.stream_client._run_forever())

        return self
    
    def _register_client_sub(self, session: ClientSession, sub: SubscribedTicker):

        if sub not in self.registry:
            # alpaca sub
            pass
        
        self.registry[sub].add(session)

    
    def _register_client_unsub(self, session: ClientSession, unsub: SubscribedTicker):
        
        if unsub in self.registry and session in self.registry[unsub]:
            listeners = self.registry[unsub]
            listeners.remove(session)
            ref_ct = len(listeners)

            if ref_ct == 0:
                pass
                # alpaca unsub

    async def serve(self, websocket: WebSocket) -> None:
        await websocket.accept()
        
        client_uuid = int(uuid.uuid4()) # collisions possible but practically unlikely at this scale 
        client = ClientSession(id=client_uuid, socket=websocket)

        async def incoming_handler():
            async for msg in websocket.iter_text():
                try:
                    validated_msg = RecievedMsgAdapter.validate_json(msg)

                    if isinstance(validated_msg, SubscribeMsg):
                        
                        tickers_to_sub: list[SubscribedTicker] = []
                        if minute_bars := validated_msg.bars:
                            for ticker in minute_bars:
                                tickers_to_sub.append(SubscribedTicker(ticker, "minute_bar"))

                        if daily_bars := validated_msg.dailyBars:
                            for ticker in daily_bars:
                                tickers_to_sub.append(SubscribedTicker(ticker, "daily_bar"))
                        
                        for ticker in tickers_to_sub:
                            self._register_client_sub(session=client, sub=ticker)
                            
                    else:

                        # Same logic as above here but call registry unsub
                        pass
                except ValidationError:
                    logger.info("Malformed message recieved to LiveStockDataFeed server.")

        async def outgoing_handler():
            while True:
                kind, data = await self.alpaca_data_queue.get()
                try:
                    bar = data if isinstance(data, Bar) else Bar.model_validate(data)
                    payload = BarEnvelope(type=kind, bar=bar).model_dump_json()
                except ValidationError:
                    logger.debug("Recieved raw data from queue instead of Alpaca.Bar")
                    payload = json.dumps({"type": kind, "bar": data})

                try:
                    await websocket.send_text(payload)
                except WebSocketDisconnect:
                    break

        consumer_task = asyncio.create_task(incoming_handler())
        producer_task = asyncio.create_task(outgoing_handler())
        # when one task completes/stops, the other will also stop. Producer and consumer should live and die together.
        done, pending = await asyncio.wait([consumer_task, producer_task], return_when=asyncio.FIRST_COMPLETED)

        for task in pending:
            task.cancel()

    async def _enqueue_minute_bar(self, bar: Bar) -> None:
        await self.alpaca_data_queue.put(bar)

    async def _enqueue_daily_bar(self, bar: Bar) -> None:
        await self.alpaca_data_queue.put(bar)

    def subscribe(self):
        min_bars = daily_bars = []

        for sub_ticker, connected_sessions in self.registry.items():
            if len(connected_sessions) > 0:
                if sub_ticker.freq == "minute_bar":
                    min_bars.append(sub_ticker.name)
                else:
                    daily_bars.append(sub_ticker.name)
        self.stream_client.subscribe_bars(self._enqueue_minute_bar, *min_bars)
        self.stream_client.subscribe_daily_bars(self._enqueue_daily_bar, *daily_bars)

    def unsubscribe(self, unsub_msg: UnsubscribeMsg):
        if not unsub_msg.bars and not unsub_msg.dailyBars:
            return

        if unsub_msg.bars:
            self.stream_client.unsubscribe_bars(*unsub_msg.bars)
        if unsub_msg.dailyBars:
            self.stream_client.unsubscribe_daily_bars(*unsub_msg.dailyBars)

    async def close(self) -> None:
        # stop_ws() is the loop-safe shutdown signal for _run_forever()
        await self.stream_client.stop_ws()
        if self._stream_task:
            await self._stream_task
