import asyncio
import logging
import os
from asyncio.queues import QueueShutDown
from contextlib import asynccontextmanager
from typing import cast

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import init_database_schema
from app.providers.alpaca.fetches import probe_credentials
from app.providers.alpaca.live import LiveStockDataFeed
from app.routers import bars, clock, financials, news, symbols, watchlist

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # runs before API startup
    await init_database_schema()
    await probe_credentials()
    app.state.live_feed = await LiveStockDataFeed.new()
    yield
    # shutdown/clean up code. runs after API shutdown
    await app.state.live_feed.close()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://localhost:{os.environ.get('HOST_PORT', '5379')}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return app.routes
    
@app.get("/health")
async def health_check():
    """Report whether this process can still deliver live bars.

    Returns 503 when a long-lived task has died, because that is the failure
    mode that is otherwise invisible from outside: the process keeps accepting
    connections and serving HTTP while delivering nothing.

    A stream that never started is *healthy* -- with lazy start, that is just a
    backend nobody has subscribed on yet.
    """
    feed = cast(LiveStockDataFeed, app.state.live_feed)

    stream_task = feed.stream_task
    if stream_task is None:
        stream_state = "idle"
    elif stream_task.done():
        stream_state = "exited"
    else:
        stream_state = "running"

    dispatcher_state = "exited" if feed._dispatcher_task.done() else "running"

    degraded = (
        stream_state == "exited"
        or (dispatcher_state == "exited" and not feed._shutting_down)
    )

    return JSONResponse(
        status_code=503 if degraded else 200,
        content={
            "status": "degraded" if degraded else "ok",
            "stream": stream_state,
            "dispatcher": dispatcher_state,
            "tickers": len(feed.registry),
            "sessions": len({s for bucket in feed.registry.values() for s in bucket}),
        },
    )

@app.websocket("/ws/live")
async def live_stock_stream(websocket: WebSocket):
    """Owns the lifecycle of a single client connection.

    The feed itself is app-scoped (one Alpaca feed fans out for everyone); this
    route accepts the socket, pumps it, and eventually tears it down.
    """
    feed = cast(LiveStockDataFeed, app.state.live_feed)

    await websocket.accept()
    session = feed.new_client(websocket)

    async def incoming_handler():
        async for msg in websocket.iter_text():
            feed.handle_client_message(session, msg)

    async def outgoing_handler():
        try:
            while True:
                payload = await session.outbox.get()
                await session.socket.send_text(payload)
        except QueueShutDown:
            await session.socket.close()
    try:
        async with asyncio.TaskGroup() as group:
            group.create_task(incoming_handler())
            group.create_task(outgoing_handler())
    except* WebSocketDisconnect:
        logger.info(f"Client {session.id} disconnected.")
    finally:
        feed.release_client(session)

app.include_router(bars.router, prefix="/api")
app.include_router(clock.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(watchlist.router, prefix="/api")
app.include_router(symbols.router, prefix="/api")
app.include_router(financials.router, prefix="/api")

