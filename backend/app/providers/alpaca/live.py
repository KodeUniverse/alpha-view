import asyncio
import json
import logging
from asyncio.queues import Queue
from typing import Annotated, Any, Literal

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

class LiveStockDataFeed:
    """Relays a single Alpaca live-bars stream to FastAPI WebSocket clients.

    Alpaca only allows one active market-data connection per account, so one
    instance is meant to live for the app's whole lifetime (create it in
    FastAPI's lifespan and stash it on app.state). `serve()` is then called
    once per client connecting to the websocket route; every connected
    client shares the same upstream stream and subscription set.
    """

    stream_client: AlpacaStockDataStream
    out_data_queue: Queue[tuple[BarKind, Bar | dict[Any, Any]]]
    _stream_task: asyncio.Task[None] | None = None

    def __init__(self):
        self.out_data_queue = Queue()

        api_key, api_secret = get_alpaca_credentials()
        self.stream_client = AlpacaStockDataStream(api_key, api_secret)

    @classmethod
    async def new(cls) -> "LiveStockDataFeed":
        self = cls()

        # alpaca-py only exposes a blocking run(). _run_forever() is its non-blocking coroutine, 
        # so we run it as a task on the app's event loop
        self._stream_task = asyncio.create_task(self.stream_client._run_forever())

        return self

    async def serve(self, websocket: WebSocket) -> None:
        await websocket.accept()

        async def incoming_handler():
            async for msg in websocket.iter_text():
                try:
                    validated_msg = RecievedMsgAdapter.validate_json(msg)

                    if isinstance(validated_msg, SubscribeMsg):
                        self.subscribe(validated_msg)
                    else:
                        self.unsubscribe(validated_msg)
                except ValidationError:
                    logger.info("Malformed message recieved to LiveStockDataFeed server.")
                    await websocket.send_text(
                        ErrorEnvelope(message="Malformed message recieved to LiveStockDataFeed server.").model_dump_json()
                    )

        async def outgoing_handler():
            while True:
                kind, data = await self.out_data_queue.get()
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

    async def _enqueue_minute_bar(self, bar: Bar | dict[Any, Any]) -> None:
        await self.out_data_queue.put(("minute_bar", bar))

    async def _enqueue_daily_bar(self, bar: Bar | dict[Any, Any]) -> None:
        await self.out_data_queue.put(("daily_bar", bar))

    def subscribe(self, sub_msg: SubscribeMsg):
        if not sub_msg.bars and not sub_msg.dailyBars:
            return

        if sub_msg.bars:
            self.stream_client.subscribe_bars(self._enqueue_minute_bar, *sub_msg.bars)
        if sub_msg.dailyBars:
            self.stream_client.subscribe_daily_bars(self._enqueue_daily_bar, *sub_msg.dailyBars)

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
