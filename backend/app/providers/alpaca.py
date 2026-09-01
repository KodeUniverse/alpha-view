import asyncio
import os
from datetime import datetime

from alpaca.data.enums import Adjustment, DataFeed
from alpaca.data.historical.stock import StockHistoricalDataClient
from alpaca.data.models import BarSet
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame, TimeFrameUnit
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import AssetClass, AssetStatus
from alpaca.trading.requests import GetAssetsRequest

from app.schemas.stock import Frequency, OHLCVData, Ticker

FREQ_MAP: dict[Frequency, TimeFrame] = {
    "intraday": TimeFrame(1, TimeFrameUnit.Minute),
    "daily": TimeFrame(1, TimeFrameUnit.Day),
    "weekly": TimeFrame(1, TimeFrameUnit.Week),
    "monthly": TimeFrame(1, TimeFrameUnit.Month),
}


def _get_credentials() -> tuple[str, str]:
    api_key = os.environ.get("ALPACA_API_KEY")
    api_secret = os.environ.get("ALPACA_API_SECRET")
    if not api_key or not api_secret:
        raise RuntimeError("Alpaca API key/secret is undefined.")
    return api_key, api_secret


def _trading_client() -> TradingClient:
    api_key, api_secret = _get_credentials()
    return TradingClient(api_key, api_secret, paper=True)


def _data_client() -> StockHistoricalDataClient:
    api_key, api_secret = _get_credentials()
    return StockHistoricalDataClient(api_key, api_secret)


async def get_symbol_list() -> list[Ticker]:
    client = _trading_client()
    request = GetAssetsRequest(
        status=AssetStatus.ACTIVE,
        asset_class=AssetClass.US_EQUITY,
    )
    assets = await asyncio.to_thread(client.get_all_assets, request)
    return [
        Ticker(
            symbol=asset.symbol,
            name=asset.name,
            exchange=asset.exchange.value if asset.exchange else None,
        )
        for asset in assets
    ]


async def get_bars(
    tickers: list[Ticker],
    freq: Frequency,
    start: datetime,
    end: datetime,
) -> dict[str, list[OHLCVData]]:
    client = _data_client()
    request = StockBarsRequest(
        symbol_or_symbols=[t.symbol for t in tickers],
        timeframe=FREQ_MAP[freq],
        start=start,
        end=end,
        adjustment=Adjustment.SPLIT,
        feed=DataFeed.IEX,
    )
    bar_set = await asyncio.to_thread(client.get_stock_bars, request)
    if not isinstance(bar_set, BarSet):
        raise TypeError(f"Expected BarSet from Alpaca, got {type(bar_set)}")

    symbol_bars: dict[str, list[OHLCVData]] = {}
    for symbol, bars in bar_set.data.items():
        symbol_bars[symbol] = [
            OHLCVData(
                time=bar.timestamp,
                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,
                volume=bar.volume,
                symbol=symbol,
                frequency=freq,
            )
            for bar in bars
        ]
    return symbol_bars


async def get_bars_for_ticker(
    ticker: Ticker,
    freq: Frequency,
    start: datetime,
    end: datetime,
) -> list[OHLCVData]:
    bars = await get_bars([ticker], freq, start, end)
    return bars.get(ticker.symbol, [])
