import { useEffect, useState } from "react";
import { socket }from '@services/socket.js';
import styles from './NewsFeed.module.css';

function NewsFeed() {
        
    const [ isLoaded, setLoaded ] = useState(false);
    const [ newsItems, setNewsItems ] = useState([]);

    useEffect(() => {
       
        const handleData = (data) => {
            console.log("Client recieved finviz data!");
            setNewsItems(data);            
        };

        socket.on("market-news", handleData);        

        return () => {
            socket.off("market-news", handleData);
        }
    }, []);
    
    return (
        <div className={styles["news-feed"]}>
            <div className={styles["news-head"]}>
                <h3>Markets News</h3>
            </div>
            <div className={styles["news-content"]}>
                {newsItems.map((article) => (
                    <NewsItem 
                    key={article.articleid} 
                    title={article.headline} 
                    url={article.url} 
                    source={article.source} />
                ))}
            </div>
        </div>
    )
}

function NewsItem({title, url, source}) {
    return (
        <div>
            <a href={url}>{title}</a>
            <p>{source}</p>
        </div>
    )
}

export default NewsFeed;
