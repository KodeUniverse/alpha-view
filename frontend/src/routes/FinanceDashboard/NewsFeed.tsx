import { useEffect, useState } from "react";
import { socket } from "@services/socket.js";
import {
  List,
  ListItemButton,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  SxProps,
} from "@mui/material";

interface NewsFeedProps {
  length: Number;
  cardStyles?: SxProps;
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
    const updateData = (data) => {
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

  if (isError) return <p>Failed to fetch news.</p>;
  if (isLoading) return <p>Loading...</p>;
  return (
    <Card sx={cardStyles}>
      <CardContent sx={{ height: "100%", overflow: "auto" }}>
        <CardHeader
          title="Market News"
          slotProps={{ title: { align: "left" } }}
        />
        <List>
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
        </List>
      </CardContent>
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
  return (
    <>
      <ListItemButton
        component="a"
        href={url}
        sx={{
          "&:hover": { backgroundColor: "var(--color-highlighted)" },
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, minWidth: 0 }}>
          <Box sx={{ flex: "0 0 auto" }}>
            <Typography>{time}</Typography>
            <Typography>{pubdate}</Typography>
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
              }}
            >
              {headline}
            </Typography>
            <Typography
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
              }}
            >
              {descr}
            </Typography>
          </Box>
        </Box>
      </ListItemButton>
      <Divider sx={{ borderColor: "#FFFFFF" }} />
    </>
  );
}

export default NewsFeed;
