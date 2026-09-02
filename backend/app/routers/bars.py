import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.providers import alpaca
from app.schemas.stock import Frequency, OHLCVData, Ticker

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/bars")
async def get_bars(
    symbols: str,
    freq: Frequency,
    start: datetime,
    end: datetime,
) -> dict[str, list[OHLCVData]]:

    ticker_list = [Ticker(symbol=s.strip()) for s in symbols.split(",") if s.strip()]
    if not ticker_list:
        raise HTTPException(status_code=400, detail="No valid symbols provided.")

    try:
        return await alpaca.get_bars(ticker_list, freq, start, end)
    except Exception as e:
        logger.exception("Failed to fetch bars from Alpaca")
        raise HTTPException(
            status_code=502, detail="Failed to fetch bars from Alpaca."
        ) from e
