import os
from datetime import datetime, timedelta, timezone
from io import StringIO
from typing import Sequence

import pandas as pd
import psycopg
import yfinance as yf

pd.set_option("display.max_rows", None)  # Show all rows
pd.set_option("display.max_columns", None)  # Show all columns
pd.set_option("display.max_colwidth", None)  # Show full column content
pd.set_option("display.width", None)  # Auto-detect terminal width


def get_symbol_id(ticker_symbol: str):
    with psycopg.connect(os.environ.get("DATABASE_URL")) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT SymbolId FROM Ticker WHERE Symbol = %s""", (ticker_symbol,)
            )
            res = cur.fetchone()[0]

    return res


def fetch_transform_data(ticker_list: Sequence[str], look_back: str):
    """
    Fetches historical OHLCV data (Yahoo Finance) for tickers and transforms
    into pandas DataFrame ready for PostgreSQL insert.

    Params:
        ticker_list: Sequence of tickers to fetch.
        look_back: Historical start date of time series. Possible values: ('6M', '1Y', '3Y', '5Y', '10Y')
    """

    resolve_start_date = {
        "6M": timedelta(weeks=4.3),
        "1Y": timedelta(weeks=52),
        "3Y": timedelta(weeks=52 * 3),
        "5Y": timedelta(weeks=52 * 5),
        "10Y": timedelta(weeks=52 * 10),
    }

    today = datetime.now()

    ticker_data = yf.download(
        tickers, start=today - resolve_start_date[look_back], end=today
    )
    update_timestamp = datetime.now(timezone.utc)

    dfs_to_aggregate = []
    for ticker in ticker_list:
        ticker_df = ticker_data.xs(ticker, axis=1, level=1)
        ticker_df.reset_index(inplace=True)

        df_mapping = {
            "Date": ticker_df.loc[:, "Date"].dt.tz_localize("UTC"),
            "Open": ticker_df.loc[:, "Open"],
            "Low": ticker_df.loc[:, "Low"],
            "High": ticker_df.loc[:, "High"],
            "Close": ticker_df.loc[:, "Close"],
            "Volume": ticker_df.loc[:, "Volume"].fillna(0).astype("int64"),
            "Symbol": pd.Series([ticker] * ticker_df.shape[0], index=ticker_df.index),
            "SymbolId": pd.Series(
                [get_symbol_id(ticker)] * ticker_df.shape[0], index=ticker_df.index
            ),
            "LastUpdated": pd.Series(
                [update_timestamp] * ticker_df.shape[0], index=ticker_df.index
            ),
        }

        dfs_to_aggregate.append(pd.concat(df_mapping, axis=1))

    return pd.concat(dfs_to_aggregate, axis=0)


if __name__ == "__main__":

    # Seed Tickers table
    tickers = tuple(pd.read_csv("symbols.csv").iloc[:, 0])
    with psycopg.connect(os.environ.get("DATABASE_URL")) as conn:
        with conn.cursor() as cur:

            update_timestamp = datetime.now(timezone.utc)
            data = [(symbol, update_timestamp) for symbol in tickers]

            cur.executemany(
                """
                INSERT INTO Ticker (Symbol, LastUpdated) VALUES (%s, %s)
                ON CONFLICT (Symbol) DO UPDATE SET LastUpdated = EXCLUDED.LastUpdated 
                """,
                data,
            )
    print("Database 'Tickers' table seeded with symbols!")

    # Seed HistoricalTS table
    buffer = StringIO()
    historical_df = fetch_transform_data(tickers, "10Y")
    historical_df[
        [
            "SymbolId",
            "Date",
            "Close",
            "High",
            "Low",
            "Open",
            "Volume",
            "LastUpdated",
        ]
    ].to_csv(buffer, index=False, header=False)
    buffer.seek(0)

    with psycopg.connect(os.environ.get("DATABASE_URL")) as conn:
        with conn.cursor() as cur:
            with cur.copy(
                """COPY HistoricalTS (SymbolId, Date, ClosePrice, HighPrice, LowPrice, OpenPrice, Volume, LastUpdated) FROM STDIN WITH (FORMAT CSV)"""
            ) as copy:
                copy.write(buffer.read())

    print("HistoricalTS table seeded with historical data!")
