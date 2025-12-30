import { useEffect, useState } from "react";
import { socket }from '@services/socket.js';
import styles from './NewsFeed.module.css';

function NewsFeed({ length }) {
        
    const [ isLoaded, setLoaded ] = useState(false);
    const [ isLoading, setLoading ] = useState(false);
    const [ isError, setError ] = useState(false);
    const [ newsItems, setNewsItems ] = useState([]);
    
    useEffect(() => {
       
        const initLoad = async () => {
            const response = await fetch(`${import.meta.env.API_URL}/api/market-news/latest`);
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setNewsItems(data.slice(0, length - 1));
                    setLoaded(true);
                } else {
                    setLoading(true);
                }
            } else {
                console.log('Error fetching market data from AlphaAPI');
                setError(true);
            }
        };
        initLoad();

        const updateData = (data) => {
            console.log("Client recieved finviz data!");
            setNewsItems(data.slice(0, length - 1));
            setLoaded(true);
        };
        
        socket.on("market-news", updateData);        

        return () => {
            socket.off("market-news", updateData);
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
                    date={article.pubdate}
                    url={article.url} 
                    source={article.newssource} />
                ))}
            </div>
        </div>
    )
}

function NewsItem({title, url, source, date}) {
    return (
        <div className={styles["news-item"]}>
            <p>{ date }</p>
            <a href={url}>{title}</a>
            <p>{source}</p>
        </div>
    )
}

export default NewsFeed;
