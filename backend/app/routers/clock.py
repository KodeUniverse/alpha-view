import logging

from fastapi import APIRouter, HTTPException

import app.providers.alpaca.fetches as alpaca
from app.schemas.stock import MarketClock

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/clock")
async def get_market_clock() -> MarketClock:
    """Report whether the US equity regular session is open, and when it next changes.

    The frontend needs this to tell "the market is shut" apart from "the feed is dead" --
    both look like silence if you only watch for bars.
    """
    try:
        return await alpaca.get_market_clock()
    except Exception as e:
        logger.exception("Failed to get market clock from Alpaca.")
        raise HTTPException(502, "Failed to get market clock from Alpaca.") from e