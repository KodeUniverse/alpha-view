import logging
import os
from typing import Annotated, Literal

import websockets
from alpaca.data.live.stock import StockDataStream
from pydantic import BaseModel, Field, ValidationError

from app.providers.alpaca.auth import get_credentials

logger = logging.getLogger(__name__)

api_key, api_secret = get_credentials()
stream_client = StockDataStream(api_key, api_secret)

class SubscribeMsg(BaseModel):
    action: Literal["subscribe"]
    bars: list[str] | None
    dailyBars: list[str] | None

class UnsubscribeMsg(BaseModel):
    action: Literal["unsubscribe"]
    bars: list[str] | None
    dailyBars: list[str] | None
type RecievedMsg = Annotated[SubscribeMsg | UnsubscribeMsg, Field(discriminator="action")]

class RecievedMsgValidate(BaseModel):
    msg: RecievedMsg

class LiveStockDataFeed:

    server: websockets.Server
    
    async def __init__(self):
        
        async def incoming_handler(websocket: websockets.ServerConnection):
            async for msg in websocket.recv_streaming():
                
                try:
                    validated_msg = RecievedMsgValidate.model_validate_json(msg)

                    if isinstance(validated_msg, SubscribeMsg):
                        
                        self.subscribe()
                    elif isinstance(validated_msg, UnsubscribeMsg):
                        self.unsubscribe()
                except ValidationError:
                    logger.info("Malformed message recieved to LiveStockDataFeed server.")
                    await websocket.send({"error": "Malformed message recieved to LiveStockDataFeed server."})

        self.server = await websockets.serve(incoming_handler, host="localhost",port=int(os.getenv("HOST_API_PORT", 8080)))
                
    async def serve(self):
        await self.server.serve_forever()

    def subscribe(tickers: list[str]):
        pass
    def unsubscribe(tickers: list[str]):
        pass
    def close(self): 
        self.server.close()


