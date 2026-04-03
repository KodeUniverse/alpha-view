import { useEffect, useState } from "react";
import { socket } from "@services/socket.js";
import styles from "./NewsFeed.module.css";
import {
  List,
  ListItemButton,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";

function NewsFeed({ length }) {
  const [isLoaded, setLoaded] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isError, setError] = useState(false);
  const [newsItems, setNewsItems] = useState([]);

  useEffect(() => {
    setLoading(true);
    const initLoad = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.API_URL}/market-news/latest`,
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
  }, [length]);

  useEffect(() => {
    const updateData = (data) => {
      console.log("Client recieved finviz data!");
      setNewsItems(data.slice(0, length));
      setLoaded(true);
    };

    socket.on("market-news", updateData);

    return () => {
      socket.off("market-news", updateData);
    };
  }, [length]);

  if (isError) return <p>Failed to fetch news.</p>;
  if (isLoading) return <p>Loading...</p>;
  return (
    <Card sx={{ width: "100%", height: "100%" }}>
      <CardContent>
        <CardHeader
          title="Market News"
          slotProps={{ title: { align: "center" } }}
        />
        <List>
          {newsItems.map((article) => {
            const dateObj = new Date(article.pubdate);
            const month = dateObj.toLocaleString("default", {
              month: "short",
            });
            const day = dateObj.toLocaleString("default", {
              day: "2-digit",
            });
            const pubTime = dateObj.toLocaleString("default", {
              timeStyle: "short",
            });
            return (
              <NewsItem
                key={article.articleid}
                title={article.headline}
                descr={article.descr}
                date={`${month}-${day}`}
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

function NewsItem({ title, descr, url, source, date, time }) {
  return (
    <>
      <ListItemButton
        component="a"
        href={url}
        sx={{
          "&:hover": { backgroundColor: "var(--color-highlighted)" },
        }}
      >
        <div className={styles["news-item"]}>
          <div
            className={`${styles["time-date-col"]} ${styles["item-date-col"]}`}
          >
            <Typography>{time}</Typography>
            <Typography>{date}</Typography>
          </div>
          <div className={styles["headline-desc-col"]}>
            <Typography
              sx={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
              }}
              href={url}
            >
              {title}
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
          </div>
        </div>
      </ListItemButton>
      <Divider sx={{ borderColor: "#FFFFFF" }} />
    </>
  );
}

export default NewsFeed;
