import logging

from fastapi import APIRouter, HTTPException

from app.providers import finnhub
from app.schemas.stock import StockBasicFinancials, Ticker

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/financials/{ticker}")
async def get_financials(ticker: str) -> StockBasicFinancials | None:
    ticker = ticker.strip() 
    if not ticker:
        raise HTTPException(400, "No ticker provided.")
    
    try:
        return await finnhub.get_basic_financials(Ticker(symbol=ticker))
    except Exception as e:
        logger.exception("Failed to fetch financials from Finnhub.")
        raise HTTPException(502, f"Failed fetching financials from Finnhub for {ticker}.") from e


