import logging

from fastapi import APIRouter, HTTPException

from app.providers import finnhub
from app.schemas.news import NewsArticle, NewsCategory

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/news")
async def get_news(category: NewsCategory) -> list[NewsArticle]:

    try:
        return await finnhub.get_market_news(category)
    except Exception as e:
        logger.exception("Failed to fetch news from Finnhub.")
        raise HTTPException(502, f"Failed to fetch news from Finnhub for category {category}.") from e
