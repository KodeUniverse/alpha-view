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
    <Card sx={{ width: "30em" }}>
      <CardContent>
        <CardHeader
          title="Market News"
          slotProps={{ title: { align: "center" } }}
        />
        <div className={styles["news-content"]}>
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
        </div>
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
            className={`${styles["news-item-col"]} ${styles["item-date-col"]}`}
          >
            <p>{time}</p>
            <p>{date}</p>
          </div>
          <div className={styles["news-item-col"]}>
            <p className={styles["item-headline"]} href={url}>
              {title}
            </p>
            <p className={styles["item-descr"]}>{descr}</p>
          </div>
        </div>
      </ListItemButton>
      <Divider sx={{ borderColor: "#FFFFFF" }} />
    </>
  );
}

export default NewsFeed;
