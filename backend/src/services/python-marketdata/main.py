import os

import pandas as pd
import yfinance as yf

tickers = tuple(pd.read_csv("symbols.csv").iloc[:, 0])

print(yf.download(tickers[0]))
