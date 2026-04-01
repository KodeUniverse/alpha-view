import Navbar from "@components/Navbar/Navbar.jsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import MetricsCard from "./BottomBarMetrics.jsx";
import WatchlistCard from "./WatchlistPanel.jsx";
import styles from "./FinanceDashboard.module.css";

function FinanceDashboard() {
  return (
    <div className={styles["pg"]}>
      <Navbar />
      <div className={styles["pg-content"]}>
        <NewsFeed length={10} />
        <ChartArea />
        <WatchlistCard />
      </div>
      <MetricsCard />
    </div>
  );
}

export default FinanceDashboard;
