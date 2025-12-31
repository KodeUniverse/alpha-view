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

CREATE TABLE IF NOT EXISTS ArticlesUpdateLog (
    SourceId SERIAL PRIMARY KEY,
    NewsSource TEXT NOT NULL,
    LastUpdated TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_source ON ArticlesUpdateLog(NewsSource);
