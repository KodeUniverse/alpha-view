from datetime import datetime
from typing import Literal

from pydantic import BaseModel

type Frequency = Literal["intraday", "daily", "weekly", "monthly"]

class OHLCVData(BaseModel):
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    symbol: str | None = None
    frequency: Frequency | None = None


class OHLCData(BaseModel):
    time: datetime
    open: float
    high: float
    low: float
    close: float


class PriceData(BaseModel):
    value: float
    time: datetime


class VolumeData(BaseModel):
    value: float
    time: datetime
    color: str


class Ticker(BaseModel):
    symbol: str
    name: str | None = None
    exchange: str | None = None


class LiveTickerFeedMessage(BaseModel):
    dailyBar: OHLCVData | None = None
    minuteBar: OHLCVData | None = None


class StockBasicFinancials(BaseModel):
    # Valuation
    peTTM: float | None = None
    forwardPE: float | None = None
    pb: float | None = None
    priceToSalesTTM: float | None = None
    pegTTM: float | None = None
    evToEBITDA: float | None = None
    evToRevenue: float | None = None
    marketCap: float | None = None
    enterpriseValue: float | None = None
    # Earnings
    epsTTM: float | None = None
    forwardEps: float | None = None  # not available in Finnhub metric response
    # Profitability
    roe: float | None = None
    netProfitMargin: float | None = None
    grossMargin: float | None = None
    operatingMargin: float | None = None
    # Growth
    revenueGrowth: float | None = None
    epsGrowth: float | None = None
    # Financial Health
    debtToEquity: float | None = None
    totalDebt: float | None = None  # not available in Finnhub metric response
    totalCash: float | None = None  # not available in Finnhub metric response
    netDebt: float | None = None  # requires totalDebt and totalCash
    currentRatio: float | None = None
    quickRatio: float | None = None
    interestCoverage: float | None = None
    # Per Share
    bookValue: float | None = None
    revenuePerShare: float | None = None
    dividendPerShare: float | None = None
    # Dividends
    divYieldTTM: float | None = None
    payoutRatio: float | None = None
    # Cash Flow
    freeCashFlow: float | None = None  # Finnhub only provides per-share values
    operatingCashFlow: float | None = None  # Finnhub only provides per-share values
    # Market
    sharesOutstanding: float | None = None  # not available in Finnhub metric response
    yearHigh: float | None = None
    yearLow: float | None = None
    # Volume
    adtv10Day: float | None = None
    # Risk
    beta: float | None = None
