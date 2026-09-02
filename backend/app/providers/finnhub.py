import asyncio
import os
from datetime import datetime
from typing import Any

import finnhub

from app.schemas.news import NewsArticle, NewsCategory
from app.schemas.stock import StockBasicFinancials, Ticker


def _client() -> finnhub.Client:
    api_key = os.environ.get("FINNHUB_API_KEY")
    if not api_key:
        raise RuntimeError("Finnhub API key is undefined.")
    return finnhub.Client(api_key=api_key)


def _transform_metrics(metric: dict[str, Any]) -> StockBasicFinancials:
    return StockBasicFinancials(
        peTTM=metric.get("peTTM"),
        forwardPE=metric.get("forwardPE"),
        pb=metric.get("pb"),
        priceToSalesTTM=metric.get("psTTM"),
        pegTTM=metric.get("pegTTM"),
        evToEBITDA=metric.get("evEbitdaTTM"),
        evToRevenue=metric.get("evRevenueTTM"),
        marketCap=metric.get("marketCapitalization"),
        enterpriseValue=metric.get("enterpriseValue"),
        epsTTM=metric.get("epsTTM"),
        roe=metric.get("roeRfy"),
        netProfitMargin=metric.get("netProfitMarginAnnual"),
        grossMargin=metric.get("grossMarginAnnual"),
        operatingMargin=metric.get("operatingMarginAnnual"),
        revenueGrowth=metric.get("revenueGrowthTTMYoy"),
        epsGrowth=metric.get("epsGrowthTTMYoy"),
        debtToEquity=metric.get("totalDebt/totalEquityAnnual"),
        currentRatio=metric.get("currentRatioAnnual"),
        quickRatio=metric.get("quickRatioAnnual"),
        interestCoverage=metric.get("netInterestCoverageAnnual"),
        bookValue=metric.get("bookValuePerShareAnnual"),
        revenuePerShare=metric.get("revenuePerShareAnnual"),
        dividendPerShare=metric.get("dividendPerShareAnnual"),
        divYieldTTM=metric.get("currentDividendYieldTTM"),
        payoutRatio=metric.get("payoutRatioAnnual"),
        yearHigh=metric.get("52WeekHigh"),
        yearLow=metric.get("52WeekLow"),
        adtv10Day=metric.get("10DayAverageTradingVolume"),
        beta=metric.get("beta"),
    )


async def get_market_news(category: NewsCategory) -> list[NewsArticle]:
    client = _client()
    articles = await asyncio.to_thread(client.general_news, category, min_id=0)
    return [
        NewsArticle(
            id=article["id"],
            headline=article["headline"],
            datetime=datetime.fromtimestamp(article["datetime"]),
            url=article["url"],
            source=article["source"],
            category=article.get("category"),
            image=article.get("image"),
            summary=article.get("summary"),
        )
        for article in articles
    ]


async def get_basic_financials(ticker: Ticker) -> StockBasicFinancials | None:
    client = _client()
    data = await asyncio.to_thread(
        client.company_basic_financials, ticker.symbol, "all"
    )
    metric = data.get("metric")
    if not metric:
        return None
    return _transform_metrics(metric)
