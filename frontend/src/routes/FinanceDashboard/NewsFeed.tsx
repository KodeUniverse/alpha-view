import { useEffect, useState } from "react";
import { socket } from "@services/socket.js";
import { Card, Text, Group, Stack, Divider, Box } from "@mantine/core";
import { NewsArticle } from "@shared/types";

interface NewsFeedProps {
  length: number;
  cardStyles?: React.CSSProperties;
}
function NewsFeed({ length, cardStyles = {} }: NewsFeedProps) {
  const [isLoaded, setLoaded] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isError, setError] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [source, setSource] = useState("ft");

  useEffect(() => {
    setLoading(true);
    const initLoad = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.API_URL}/news/source/${source}/latest`,
        );
        if (response.ok) {
          const data = await response.json();
          setNewsItems(data.slice(0, length));
          setLoaded(true);
        } else {
          setError(true);
        }
      } catch (e) {
        console.log("Error: Could not contact AlphaAPI server");
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    initLoad();
  }, [length, source]);

  useEffect(() => {
    const updateData = (data: NewsArticle[]) => {
      console.log("Client recieved FT news data!");
      setNewsItems(data.slice(0, length));
      setLoaded(true);
    };

    const socketName = `${source}-news`;
    socket.on(socketName, updateData);

    return () => {
      socket.off(socketName, updateData);
    };
  }, [length, source]);

  if (isError) return <Text>Failed to fetch news.</Text>;
  if (isLoading) return <Text>Loading...</Text>;
  return (
    <Card style={{ overflowY: "auto", ...cardStyles }}>
      <Text fw={700} size="lg" mb={10}>
        Market News
      </Text>
      <Stack gap={0}>
        {newsItems.map((article) => {
          const dateObj = new Date(article.pubdate);
          const month = dateObj.toLocaleString("default", { month: "short" });
          const day = dateObj.toLocaleString("default", {
            day: "2-digit",
          });
          const pubTime = dateObj.toLocaleString("default", {
            timeStyle: "short",
          });
          return (
            <NewsItem
              key={article.articleid}
              headline={article.headline}
              descr={article.descr}
              pubdate={`${month}-${day}`}
              time={`${pubTime}`}
              url={article.url}
              source={article.newssource}
            />
          );
        })}
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
