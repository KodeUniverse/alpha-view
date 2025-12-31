import { Link } from "react-router-dom";
import pyramidGif from "@assets/pyramid.gif"
import styles from './Navbar.module.css';

function Navbar() {
    return (
        <div className={styles.navbar}>
            <img src={pyramidGif} alt="Logo" />
            <nav className={styles.nav}>
                <Link to="/">Home</Link>
                <Link to="/finance">Financial Dashboard</Link>
            </nav>
        </div>
    )
}

export default Navbar;
