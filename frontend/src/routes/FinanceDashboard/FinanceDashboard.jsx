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
                <NewsFeed length={30} cardStyles={{ width: "35%", height: "100%" }} />
                <ChartArea cardStyles={{ width: "100%", height: "100%" }} />
                <WatchlistCard cardStyles={{ width: "35%", height: "100%" }} />

            </div>
        </div>
    );
}

export default FinanceDashboard;
