import { useEffect, useState } from "react";
import { Card, Text, Group, Stack, Divider, Box } from "@mantine/core";
import { NewsArticle } from "@shared/types";
import { useMarketNews } from "@/hooks/queries";

interface NewsFeedProps {
    length: number;
    cardStyles?: React.CSSProperties;
}
function NewsFeed({ length, cardStyles = {} }: NewsFeedProps) {
    const {
        data: newsItems,
        error,
        isError,
        isLoading,
    } = useMarketNews("general");

    if (isError) return <Text>Failed to fetch news.</Text>;
    if (isLoading) return <Text>Loading...</Text>;
    return (
        <Card style={{ overflowY: "auto", ...cardStyles }}>
            <Text fw={700} size="lg" mb={10}>
                Market News
            </Text>
            <Stack gap="xs">
                {newsItems && newsItems.length > 0 ? (
                    newsItems.map((article) => {
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
                                descr={article.summary}
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
            </Stack>
        </Card>
    );
}

interface NewsItemProps {
    headline: string;
    descr: string;
    url: string;
    source: string;
    pubdate: string;
    time: string;
}
function NewsItem({
    headline,
    descr,
    url,
    source,
    pubdate,
    time,
}: NewsItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Card
            component="a"
            href={url}
            className="news-item"
            style={{
                textDecoration: "none",
                color: "inherit",
                width: "100%",
                display: "block",
                boxShadow: isHovered ? "0 0 15px 2px var(--color-highlighted)" : "none",
                transition: "box-shadow 0.2s ease",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Group gap="xs" style={{ minWidth: 0 }}>
                <Stack gap={0} style={{ flex: "0 0 auto" }}>
                    <Text size="sm">{time}</Text>
                    <Text size="sm">{pubdate}</Text>
                </Stack>
                <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={700} truncate display="block">
                        {headline}
                    </Text>
                    <Text size="sm" truncate display="block">
                        {descr}
                    </Text>
                </Box>
            </Group>
        </Card>
    );
}

export default NewsFeed;
