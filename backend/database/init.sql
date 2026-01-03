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
    SymbolId SERIAL PRIMARY KEY NOT NULL,
    Symbol TEXT NOT NULL,
    SpotPrice NUMERIC NOT NULL,
    LastUpdated TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_symbol ON Ticker(Symbol);

CREATE TABLE IF NOT EXISTS HistoricalTS (
    SymbolId INT REFERENCES Ticker(SymbolId),
    Date TIMESTAMPTZ NOT NULL,
    ClosePrice NUMERIC NOT NULL,
    HighPrice NUMERIC NOT NULL,
    LowPrice NUMERIC NOT NULL,
    OpenPrice NUMERIC NOT NULL,
    Volume NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ts_date ON HistoricalTS(Date);
