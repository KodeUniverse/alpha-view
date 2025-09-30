-- init.sql
CREATE TABLE IF NOT EXISTS article (
    article_id SERIAL PRIMARY KEY,
    article_headline VARCHAR(100) NOT NULL,
    article_url VARCHAR(100) NOT NULL,
    article_date VARCHAR(20) NOT NULL,
    source VARCHAR(10) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_source ON article(source);
CREATE INDEX IF NOT EXISTS idx_article_date ON article(article_date);
