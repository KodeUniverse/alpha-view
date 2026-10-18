"""Market clock endpoint.

The reason this endpoint exists: the frontend cannot tell "the market is shut" apart from
"the feed is dead" by watching for bars, because both look like silence. These tests pin the
contract the status indicator depends on -- that `is_open` is reported faithfully, and that
an upstream failure surfaces as a 502 rather than a silently-open-looking 200.
"""

import logging
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException

import app.providers.alpaca.fetches as fetches
from app.routers import clock as clock_router


class FakeClock:
    def __init__(self, is_open: bool):
        self.is_open = is_open
        self.next_open = datetime(2026, 10, 19, 13, 30, tzinfo=UTC)
        self.next_close = datetime(2026, 10, 19, 20, 0, tzinfo=UTC)


class FakeTradingClient:
    def __init__(self, clock: FakeClock):
        self._clock = clock

    def get_clock(self):
        return self._clock


def install_client(monkeypatch, clock: FakeClock) -> None:
    # fetches imports the module-level `_trading_client` symbol, so the double replaces it
    # in this namespace rather than patching the SDK itself.
    monkeypatch.setattr(fetches, "_trading_client", lambda: FakeTradingClient(clock))


# --- Happy path -------------------------------------------------------------


@pytest.mark.asyncio
async def test_clock_reports_open_session(monkeypatch):
    install_client(monkeypatch, FakeClock(is_open=True))

    result = await clock_router.get_market_clock()

    assert result.is_open is True
    assert result.next_open == datetime(2026, 10, 19, 13, 30, tzinfo=UTC)
    assert result.next_close == datetime(2026, 10, 19, 20, 0, tzinfo=UTC)


@pytest.mark.asyncio
async def test_clock_reports_closed_session(monkeypatch):
    """Alpaca reports regular hours only, so this is false overnight, at weekends, and on
    holidays alike -- the indicator treats it as 'not currently in session'."""
    install_client(monkeypatch, FakeClock(is_open=False))

    result = await clock_router.get_market_clock()

    assert result.is_open is False


# --- Failure path -----------------------------------------------------------


@pytest.mark.asyncio
async def test_upstream_failure_becomes_a_502(monkeypatch):
    def boom():
        raise RuntimeError("alpaca unreachable")

    monkeypatch.setattr(fetches, "_trading_client", lambda: type("C", (), {"get_clock": boom})())

    with pytest.raises(HTTPException) as excinfo:
        await clock_router.get_market_clock()

    assert excinfo.value.status_code == 502
    assert excinfo.value.__cause__ is not None, "must chain the provider error"


@pytest.mark.asyncio
async def test_upstream_failure_is_logged(monkeypatch, caplog):
    def boom():
        raise RuntimeError("alpaca unreachable")

    monkeypatch.setattr(fetches, "_trading_client", lambda: type("C", (), {"get_clock": boom})())

    with caplog.at_level(logging.ERROR), pytest.raises(HTTPException):
        await clock_router.get_market_clock()

    assert "market clock" in caplog.text