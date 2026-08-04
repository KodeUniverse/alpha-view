import { Card, Text, Group } from "@mantine/core";
import { useMarketNews } from "@/hooks/queries";

interface NewsFeedProps {
    length: number;
    cardStyles?: React.CSSProperties;
}

function NewsFeed({ length, cardStyles = {} }: NewsFeedProps) {
    const {
        data: newsItems,
        isError,
        isLoading,
    } = useMarketNews("general");

    if (isError) return <Text>Failed to fetch news.</Text>;
    if (isLoading) return <Text>Loading...</Text>;
    return (
        <Card
            style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                ...cardStyles,
            }}
        >
            <Text fw={700} size="lg" mb={10}>
                Market News
            </Text>
            {newsItems && newsItems.length > 0 ? (
                newsItems.slice(0, length).map((article) => {
                    const month = article.datetime.toLocaleString("default", {
                        month: "short",
                    });
                    const day = article.datetime.toLocaleString("default", {
                        day: "2-digit",
                    });
                    const pubTime = article.datetime.toLocaleString("default", {
                        timeStyle: "short",
                    });
                    return (
                        <NewsItem
                            key={article.id}
                            headline={article.headline}
                            pubdate={`${month}-${day}`}
                            time={`${pubTime}`}
                            url={article.url}
                            source={article.source}
                        />
                    );
                })
            ) : (
                <Text>No news to show.</Text>
            )}
        </Card>
    );
}

interface NewsItemProps {
    headline: string;
    url: string;
    source: string;
    pubdate: string;
    time: string;
}

function NewsItem({ headline, url, source, pubdate, time }: NewsItemProps) {
    return (
        <Card
            component="a"
            href={url}
            target="_blank"
            rel="noreferrer"
            className="news-item"
            style={{
                textDecoration: "none",
                color: "inherit",
                padding: 12,
                flexShrink: 0,
            }}
        >
            <Text
                fw={700}
                size="sm"
                lh={1.4}
                style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}
            >
                {headline}
            </Text>
            <Group gap={6} wrap="nowrap" justify="space-between" mt={8}>
                <Text
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        flex: "0 1 auto",
                    }}
                    truncate
                >
                    {source}
                </Text>
                <Text
                    style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        flex: "0 0 auto",
                    }}
                >
                    {time} · {pubdate}
                </Text>
            </Group>
        </Card>
    );
}

export default NewsFeed;
