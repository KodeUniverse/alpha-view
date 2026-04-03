import Navbar from "@components/Navbar/Navbar.jsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";
import MetricsCard from "./BottomBarMetrics.jsx";
import WatchlistCard from "./WatchlistPanel.jsx";
import styles from "./FinanceDashboard.module.css";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { fastHorizontalCompactor } from "react-grid-layout/extras";

function FinanceDashboard() {
  const { width, containerRef, mounted } = useContainerWidth();

  const gridCols = 14;

  const layouts = [
    { i: "chart", x: Math.floor(gridCols / 2) - 4, y: 0, w: 8, h: 22 },
    { i: "watchlist", x: gridCols, y: 0, w: 3, h: 22 },
    { i: "news", x: 0, y: 0, w: 3, h: 22 },
    { i: "metrics", x: 0, y: 7, w: gridCols, h: 3 },
  ];

  return (
    <div className={styles["pg"]}>
      <Navbar />
      <div ref={containerRef} className={styles["pg-content"]}>
        {mounted && (
          <ReactGridLayout
            layout={layouts}
            width={width}
            gridConfig={{ cols: 14, rowHeight: 30, maxRows: 20 }}
            compactor={fastHorizontalCompactor}
          >
            <div key="news">
              <NewsFeed length={10} />
            </div>
            <div key="chart">
              <ChartArea />
            </div>
            <div key="watchlist">
              <WatchlistCard />
            </div>
            <div key="metrics">
              <MetricsCard />
            </div>
          </ReactGridLayout>
        )}
      </div>
    </div>
  );
}

export default FinanceDashboard;
