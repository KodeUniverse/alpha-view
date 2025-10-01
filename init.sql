-- init.sql
CREATE TABLE IF NOT EXISTS Article (
    ArticleId SERIAL PRIMARY KEY,
    Headline VARCHAR(100) NOT NULL,
    URL VARCHAR(100) NOT NULL,
    Date VARCHAR(20) NOT NULL,
    Source VARCHAR(10) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_source ON Article(Source);
CREATE INDEX IF NOT EXISTS idx_article_date ON Article(Date);
