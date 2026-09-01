import logging

from fastapi import APIRouter, HTTPException

from app.providers import alpaca
from app.schemas.stock import Ticker

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/symbols")
async def get_symbol_list() -> list[Ticker]:

    try:
        return await alpaca.get_symbol_list()
    except Exception as e:
        logger.exception("Failed to get symbol list from Alpaca.")
        raise HTTPException(502, "Failed to get symbol list from Alpaca.") from e

