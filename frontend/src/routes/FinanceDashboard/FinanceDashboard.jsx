import Navbar from '@components/Navbar/Navbar.jsx';
import NewsFeed from './NewsFeed.jsx';

function FinanceDashboard() {
    
    return (
        <>
            <Navbar />
            <NewsFeed length={10}/>
            FINANCE DASHBOARD
        </>
    )

}

export default FinanceDashboard;
