-- init.sql
CREATE TABLE IF NOT EXISTS Article (
    ArticleId SERIAL PRIMARY KEY,
    Headline TEXT NOT NULL,
    Descr TEXT,
    URL TEXT NOT NULL,
    PubDate TIMESTAMPTZ NOT NULL,
    NewsSource TEXT NOT NULL,
    LastUpdated TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_url ON Article(URL);
CREATE INDEX IF NOT EXISTS idx_article_pubdate ON Article(PubDate DESC);
CREATE INDEX IF NOT EXISTS idx_article_pubdate_source ON Article(NewsSource, PubDate);

CREATE TABLE IF NOT EXISTS Ticker (
    SymbolId SERIAL PRIMARY KEY,
    Symbol TEXT NOT NULL,
    LastUpdated TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_symbol ON Ticker(Symbol);

CREATE TABLE IF NOT EXISTS CurrentPrices (
    SymbolId INT PRIMARY KEY REFERENCES Ticker(SymbolId) ON DELETE CASCADE,
    SpotPrice NUMERIC(10, 2) NOT NULL,
    LastUpdated TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS IntradayPrices (
    id SERIAL PRIMARY KEY,
    SymbolId INT NOT NULL REFERENCES Ticker(SymbolId),
    Timestamp TIMESTAMPTZ NOT NULL,
    OpenPrice NUMERIC(10, 2) NOT NULL,
    ClosePrice NUMERIC(10, 2) NOT NULL,
    HighPrice NUMERIC(10, 2) NOT NULL,
    LowPrice NUMERIC(10, 2) NOT NULL,
    Volume BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS HistoricalTS (
    id SERIAL PRIMARY KEY,
    SymbolId INT REFERENCES Ticker(SymbolId),
    Date TIMESTAMPTZ NOT NULL,
    ClosePrice NUMERIC(10, 2) NOT NULL,
    HighPrice NUMERIC(10, 2) NOT NULL,
    LowPrice NUMERIC(10, 2) NOT NULL,
    OpenPrice NUMERIC(10, 2) NOT NULL,
    Volume BIGINT NOT NULL,
    LastUpdated TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_date ON HistoricalTS(SymbolId, Date);
