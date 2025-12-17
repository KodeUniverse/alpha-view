-- init.sql
CREATE TABLE IF NOT EXISTS article (
    ArticleId SERIAL PRIMARY KEY,
    Headline TEXT NOT NULL,
    URL TEXT NOT NULL,
    Date TEXT NOT NULL,
    Source TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_source ON article(Source);
CREATE INDEX IF NOT EXISTS idx_article_date ON article(Date);
