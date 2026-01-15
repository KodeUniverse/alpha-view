import Navbar from "@components/Navbar/Navbar.jsx";
import NewsFeed from "./NewsFeed.jsx";
import ChartArea from "./ChartArea.jsx";

function FinanceDashboard() {
  return (
    <>
      <Navbar />
      <NewsFeed length={10} />
      <ChartArea />
    </>
  );
}

export default FinanceDashboard;
