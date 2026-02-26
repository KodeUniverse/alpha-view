import Navbar from "@components/Navbar/Navbar.jsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import styles from "./FinanceDashboard.module.css";

function FinanceDashboard() {
    return (
        <div className={styles["pg"]}>
            <Navbar />
            <div className={styles["pg-content"]}>
                <NewsFeed length={10} />
                <ChartArea />
            </div>
        </div>
    );
}

export default FinanceDashboard;
